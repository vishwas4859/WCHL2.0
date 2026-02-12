use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::caller;
use ic_cdk::{query, update};
use ic_cdk::storage;
use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

/// Define total token supply
const TOTAL_SUPPLY: u64 = 1_000_000_000; // 1 Billion RDT Tokens

#[derive(CandidType, Deserialize, Default, Clone, Debug)]
struct RideToken {
    balances: HashMap<Principal, u64>,
    issued_supply: u64,
}

// Use Lazy + Mutex to store the state safely
static TOKEN_STATE: Lazy<Mutex<RideToken>> = Lazy::new(|| Mutex::new(RideToken::default()));

/// Get mutable access to the RideToken state
fn get_token_state() -> &'static Mutex<RideToken> {
    &TOKEN_STATE
}

// Storage Types
type RideStorage = HashMap<String, Ride>;
type NotificationStorage = Vec<Notification>;

static STORAGE_STATE: Lazy<Mutex<(RideStorage, NotificationStorage)>> = 
    Lazy::new(|| Mutex::new((HashMap::new(), Vec::new())));

#[derive(CandidType, Deserialize, Default, Clone, Debug)]
struct DriverStats {
    completed_rides: u64,
    last_reward_at: u64,
}

static DRIVER_STATS: Lazy<Mutex<HashMap<String, DriverStats>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Initialize both token and ride storage
#[ic_cdk::init]
fn init() {
    // Initialize token state
    let restored_token_state: Option<(RideToken,)> = storage::stable_restore().ok();
    let mut token_state = TOKEN_STATE.lock().unwrap();
    *token_state = restored_token_state.unwrap_or_default().0;

    // Initialize ride storage
    let mut storage_state = STORAGE_STATE.lock().unwrap();
    *storage_state = (HashMap::new(), Vec::new());
}

/// Mint tokens when user buys
#[update]
fn buy_tokens(amount: u64) -> String {
    let buyer: Principal = caller(); // Get the caller's Principal ID
    ic_cdk::println!("🛑 Attempting to mint for: {}", buyer);

    if buyer == Principal::anonymous() {
        return "❌ Error: Cannot mint tokens for anonymous principal.".to_string();
    }

    let mut state = get_token_state().lock().unwrap();

    if state.issued_supply + amount > TOTAL_SUPPLY {
        return "❌ Purchase failed: Exceeds total supply.".to_string();
    }

    let balance = state.balances.entry(buyer.clone()).or_insert(0);
    *balance += amount;
    state.issued_supply += amount;

    // Save state after update
    storage::stable_save((state.clone(),)).expect("❌ Failed to save state");

    let new_balance = *state.balances.get(&buyer).unwrap_or(&0);
    ic_cdk::println!("✅ Minted {} RDT to {}. New balance: {}", amount, buyer, new_balance);

    format!("✅ Minted {} RDT to your wallet!", amount)
}

/// Pay driver for a ride
#[update]
fn pay_for_ride(driver: Principal, amount: u64) -> String {
    let user = caller();
    ic_cdk::println!("🚖 Payment attempt: {} is paying {} RDT to {}", user, amount, driver);

    if user == Principal::anonymous() {
        return "❌ Error: Anonymous principals cannot make payments.".to_string();
    }

    let mut state = get_token_state().lock().unwrap();

    // Get current balances
    let user_balance = state.balances.get(&user).cloned().unwrap_or(0);
    let driver_balance = state.balances.get(&driver).cloned().unwrap_or(0);

    // Verify sufficient balance
    if user_balance < amount {
        return format!("❌ Payment failed: Insufficient balance. You have {} RDT.", user_balance);
    }

    // Execute the transfer
    state.balances.insert(user, user_balance - amount);
    state.balances.insert(driver, driver_balance + amount);

    // Save state
    storage::stable_save((state.clone(),)).expect("❌ Failed to save state");

    ic_cdk::println!("✅ Payment successful: {} RDT transferred from {} to {}", amount, user, driver);
    ic_cdk::println!("New balances - User: {}, Driver: {}", user_balance - amount, driver_balance + amount);

    format!("✅ Successfully paid {} RDT to driver!", amount)
}

/// Get user balance
#[query]
fn get_balance(user: Principal) -> u64 {
    let state = get_token_state().lock().unwrap();
    let balance = *state.balances.get(&user).unwrap_or(&0);

    ic_cdk::println!("🔍 Balance check for {}: {}", user, balance);
    balance
}

/// Save state before canister upgrade
#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    let token_state = get_token_state().lock().unwrap();
    let storage_state = STORAGE_STATE.lock().unwrap();
    let driver_stats = DRIVER_STATS.lock().unwrap();
    storage::stable_save((&*token_state, &*storage_state, &*driver_stats))
        .expect("Failed to save state before upgrade");
}

/// Restore state after canister upgrade
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    let (token_state, storage_state, driver_stats): (
        RideToken, 
        (RideStorage, NotificationStorage),
        HashMap<String, DriverStats>
    ) = storage::stable_restore().unwrap_or_default();
    
    let mut t_state = TOKEN_STATE.lock().unwrap();
    *t_state = token_state;
    
    let mut s_state = STORAGE_STATE.lock().unwrap();
    *s_state = storage_state;
    
    let mut d_stats = DRIVER_STATS.lock().unwrap();
    *d_stats = driver_stats;
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub enum RideStatus {
    Open,
    InProgress,
    Completed,
    Cancelled,
}

// Notification Structure
#[derive(CandidType, Deserialize, Clone)]
pub struct Notification {
    pub user_id: String,
    pub message: String,
}

// Ride Structure
#[derive(CandidType, Deserialize, Clone)]
pub struct Ride {
    pub ride_id: String,
    pub riders: HashSet<String>,
    pub origin: String,
    pub destination: String,
    pub owner: String,
    pub is_driver: bool,
    pub driver_id: Option<String>, // Driver ID (default: None)
    pub status: RideStatus,
    pub max_riders: usize,
    pub created_at: u64,
}

// Helper function to collect notifications before sending them
fn collect_notifications(ride: &Ride, message: &str) -> Vec<(String, String)> {
    ride.riders
        .iter()
        .map(|rider| (rider.clone(), message.to_string()))
        .collect()
}

// Update send_notification to handle multiple notifications at once
fn send_notifications(state: &mut (RideStorage, NotificationStorage), notifications: Vec<(String, String)>) {
    for (user_id, message) in notifications {
        state.1.push(Notification {
            user_id,
            message,
        });
    }
}

// Post Ride Function
#[ic_cdk::update]
fn post_ride(user_id: String, origin: String, destination: String, max_riders: u64, is_driver_created: bool) -> String {
    let ride_id = format!("ride-{}", ic_cdk::api::time());
    let mut riders = HashSet::new();
    riders.insert(user_id.clone());

    let new_ride = Ride {
        ride_id: ride_id.clone(),
        riders,
        origin,
        destination,
        owner: user_id.clone(),
        is_driver: is_driver_created,
        driver_id: if is_driver_created { Some(user_id) } else { None },
        status: RideStatus::Open,
        max_riders: max_riders as usize,
        created_at: ic_cdk::api::time(),
    };

    let mut state = STORAGE_STATE.lock().unwrap();
    state.0.insert(ride_id.clone(), new_ride);
    
    ride_id
}

// Get All Rides
#[ic_cdk::query]
fn get_all_rides() -> Vec<Ride> {
    let state = STORAGE_STATE.lock().unwrap();
    state.0.values().cloned().collect()
}

// Search Rides by Origin, Destination, and Status
#[ic_cdk::query]
fn search_rides(origin: Option<String>, destination: Option<String>, status: Option<RideStatus>) -> Vec<Ride> {
    let state = STORAGE_STATE.lock().unwrap();

    state.0
        .values()
        .filter(|ride| {
            let origin_matches = origin.as_ref().map_or(true, |o| 
                ride.origin.to_lowercase().contains(&o.to_lowercase())
            );
            let destination_matches = destination.as_ref().map_or(true, |d| 
                ride.destination.to_lowercase().contains(&d.to_lowercase())
            );
            let status_matches = status.as_ref().map_or(true, |s| &ride.status == s);

            origin_matches && destination_matches && status_matches
        })
        .cloned()
        .collect()
}

// Request to Join Ride
#[ic_cdk::update]
fn request_to_join(ride_id: String, requester_id: String) -> String {
    let mut state = STORAGE_STATE.lock().unwrap();

    if let Some(ride) = state.0.get_mut(&ride_id) {
        if ride.status != RideStatus::Open {
            return "Ride is not open for new riders.".to_string();
        }

        if ride.riders.contains(&requester_id) {
            return "You are already part of this ride.".to_string();
        }

        if ride.riders.len() >= ride.max_riders {
            return "Ride is full.".to_string();
        }

        ride.riders.insert(requester_id.clone());
        let notification = vec![(
            ride.owner.clone(),
            format!("User {} requested to join your ride.", requester_id)
        )];
        send_notifications(&mut state, notification);

        return "Request sent to ride owner.".to_string();
    }

    "Ride not found.".to_string()
}

// Accept Rider Request
#[ic_cdk::update]
fn accept_rider(ride_id: String, owner_id: String, user_id: String) -> String {
    let mut state = STORAGE_STATE.lock().unwrap();

    if let Some(ride) = state.0.get_mut(&ride_id) {
        if ride.owner != owner_id {
            return "Only the ride owner can accept requests.".to_string();
        }

        if ride.riders.len() < ride.max_riders {
            ride.riders.insert(user_id.clone());
            let notification = vec![(
                user_id,
                "Your request to join the ride has been accepted.".to_string()
            )];
            send_notifications(&mut state, notification);
            return "User added to the ride.".to_string();
        }

        return "Ride is already full.".to_string();
    }

    "Ride not found.".to_string()
}

// Update the delete_ride function to be public and include owner verification
#[ic_cdk::update]
fn delete_ride(ride_id: String, owner_id: String) -> String {
    let mut state = STORAGE_STATE.lock().unwrap();
    
    // Check if ride exists and verify ownership
    let ride = match state.0.get(&ride_id) {
        Some(r) if r.owner == owner_id => r.clone(),
        Some(_) => return "Only the ride owner can delete the ride.".to_string(),
        None => return "Ride not found.".to_string(),
    };

    // Remove the ride first
    state.0.remove(&ride_id);
    
    // Collect and send notifications
    let notifications = collect_notifications(&ride, "A ride you joined has been deleted.");
    send_notifications(&mut state, notifications);

    "Ride deleted successfully.".to_string()
}

// Update cancel_ride to be simpler
#[ic_cdk::update]
fn cancel_ride(ride_id: String, owner_id: String) -> String {
    delete_ride(ride_id, owner_id)
}

// Get User Notifications
#[ic_cdk::query]
fn get_notifications(user_id: String) -> Vec<String> {
    let state = STORAGE_STATE.lock().unwrap();

    state.1
        .iter()
        .filter(|n| n.user_id == user_id)
        .map(|n| n.message.clone())
        .collect()
}

// Driver Join Function
#[ic_cdk::update]
fn driver_join(ride_id: String, driver_id: String) -> String {
    let mut state = STORAGE_STATE.lock().unwrap();

    if let Some(ride) = state.0.get_mut(&ride_id) {
        if ride.status != RideStatus::Open {
            return "Ride is not open for drivers.".to_string();
        }

        if ride.driver_id.is_some() {
            return "Ride already has a driver.".to_string();
        }

        ride.driver_id = Some(driver_id.clone());
        ride.is_driver = true;
        
        // Collect notifications for all riders
        let mut notifications = vec![(
            ride.owner.clone(),
            format!("Driver {} has joined your ride.", driver_id)
        )];
        
        // Add notifications for other riders
        for rider in &ride.riders {
            if rider != &ride.owner {
                notifications.push((
                    rider.clone(),
                    "A driver has joined your ride.".to_string()
                ));
            }
        }
        
        send_notifications(&mut state, notifications);
        return "Successfully joined as driver.".to_string();
    }

    "Ride not found.".to_string()
}

#[update]
fn check_driver_rewards(driver_id: String) -> String {
    let mut stats = DRIVER_STATS.lock().unwrap();
    let driver_stats = stats.entry(driver_id.clone()).or_default();
    
    // Count rides where this driver was assigned
    let storage = STORAGE_STATE.lock().unwrap();
    let completed_rides = storage.0.values()
        .filter(|ride| {
            ride.driver_id.as_ref().map_or(false, |id| id == &driver_id)
        })
        .count() as u64;
    
    driver_stats.completed_rides = completed_rides;
    
    // Calculate rewards (10 RDT per 10 rides)
    let eligible_rewards = (completed_rides / 10) * 10;
    let already_rewarded = driver_stats.last_reward_at;
    let pending_rewards = if eligible_rewards > already_rewarded {
        eligible_rewards - already_rewarded
    } else {
        0
    };
    
    if pending_rewards > 0 {
        // Mint reward tokens
        let mut token_state = get_token_state().lock().unwrap();
        if let Ok(principal) = Principal::from_text(&driver_id) {
            let balance = token_state.balances.entry(principal).or_insert(0);
            *balance += pending_rewards;
            driver_stats.last_reward_at = eligible_rewards;
            
            format!("🎉 Congratulations! {} RDT tokens rewarded for completing {} rides!", 
                   pending_rewards, completed_rides)
        } else {
            "❌ Error: Invalid driver ID".to_string()
        }
    } else {
        format!("🚗 You have completed {} rides. Complete {} more rides for your next reward.", 
               completed_rides, 10 - (completed_rides % 10))
    }
}