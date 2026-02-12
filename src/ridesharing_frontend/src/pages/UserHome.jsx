import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Fix import path
import "../styles/UserHome.css";

function UserHome() {
  const navigate = useNavigate();
  const { actor, isAuthenticated, principal, postRide, getAllRides, searchRides, requestToJoin, buyTokens, getBalance, cancelRide, payForRide, driverJoin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [availableRides, setAvailableRides] = useState([]);
  const [tokenBalance, setTokenBalance] = useState(0); // Add token balance state
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [rideDetails, setRideDetails] = useState({
    from: "",
    to: "",
    time: "",
    seats: "",
    price: "",
    driverAssigned: false, // Add this field
  });
  const [userRides, setUserRides] = useState([
    {
      from: "Mumbai",
      to: "Pune",
      time: "10:00",
      seats: 4,
      price: 50,
      driverAssigned: true, // Add this field
      requestedUsers: [], // Add this to track ride requests
    },
  ]); // Example data, replace with actual user rides
  const [amount, setAmount] = useState(""); // Add this state for token amount
  const [searchMode, setSearchMode] = useState(false);
  const [matchingRides, setMatchingRides] = useState([]); // Add new state for matching rides

  // Add new state for ride updates
  const [lastCreatedRide, setLastCreatedRide] = useState(null);

  // Update useEffect to only fetch initial data
  useEffect(() => {
    if (isAuthenticated && actor) {
      const initLoad = async () => {
        await fetchBalance();
        await fetchRides();
      };
      initLoad();
    }
  }, [isAuthenticated, actor]); // Remove other dependencies

  // Add separate effect for mode changes
  useEffect(() => {
    if (isAuthenticated && actor) {
      fetchRides();
    }
  }, [isCreateMode]);

  // Add effect to update rides when in create mode
  useEffect(() => {
    if (isAuthenticated && actor && isCreateMode) {
      const updateUserRides = async () => {
        const rides = await getAllRides();
        const userRides = rides.filter(ride => ride.owner === principal);
        setAvailableRides(userRides);
      };
      updateUserRides();
    }
  }, [lastCreatedRide, isCreateMode]);

  // Update fetchRides to work with both modes and search
  const fetchRides = async () => {
    if (!actor) return;
    setIsLoading(true);
    try {
      const rides = await getAllRides();
      if (rides && Array.isArray(rides)) {
        const filteredRides = isCreateMode
          ? rides.filter(ride => ride.owner === principal)
          : rides.filter(ride => 
              ride.status?.Open !== undefined && 
              ride.owner !== principal
            );
        setAvailableRides(filteredRides);
      }
    } catch (error) {
      console.error("Failed to fetch rides:", error);
    }
    setIsLoading(false);
  };

  const fetchBalance = async () => {
    const balance = await getBalance();
    setTokenBalance(balance);
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleBuyTokens = async () => {
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await buyTokens(parseInt(amount));
      if (result) {
        alert("Tokens purchased successfully!");
        await fetchBalance(); // Fetch new balance immediately
        setAmount("");
      }
    } catch (error) {
      console.error("Failed to buy tokens:", error);
      alert("Failed to buy tokens. Please try again.");
    }
    setIsLoading(false);
  };

  // Update handleCreateRide to track new rides
  const handleCreateRide = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const seats = parseInt(rideDetails.seats);
      if (isNaN(seats) || seats <= 0) {
        alert("Please enter a valid number of seats");
        return;
      }

      // Explicitly set is_driver_created to false for user rides
      const rideId = await postRide(
        rideDetails.from,
        rideDetails.to,
        seats,
        false  // explicitly mark as not driver-created
      );
      
      if (rideId) {
        setRideDetails({
          from: "",
          to: "",
          time: "",
          seats: "",
          price: "",
          driverAssigned: false,
        });
        await fetchRides();
        alert("Ride created successfully! Waiting for a driver to join.");
      }
    } catch (error) {
      console.error("Failed to create ride:", error);
      alert("Failed to create ride. Please try again.");
    }
    setIsLoading(false);
  };

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm("Are you sure you want to delete this ride?")) return;

    setIsLoading(true);
    try {
      const result = await cancelRide(rideId, principal);
      if (result) {
        alert("Ride deleted successfully!");
        await fetchRides();
      } else {
        alert("Failed to delete ride. You might not be the owner.");
      }
    } catch (error) {
      console.error("Failed to delete ride:", error);
      alert("Failed to delete ride. Please try again.");
    }
    setIsLoading(false);
  };

  const handleAcceptRide = async (rideId) => {
    setIsLoading(true);
    try {
      const result = await requestToJoin(rideId);
      if (result) {
        alert("Successfully requested to join the ride!");
        await fetchRides();
      }
    } catch (error) {
      console.error("Failed to join ride:", error);
      alert("Failed to join ride. Please try again.");
    }
    setIsLoading(false);
  };

  // Update handleSearchRides function
  const handleSearchRides = async () => {
    setIsLoading(true);
    try {
      console.log("Searching with:", { fromLocation, toLocation });
      
      const searchResults = await searchRides(
        fromLocation || null,
        toLocation || null
      );
      
      console.log("Search results:", searchResults);
      
      // Filter based on current mode
      const filteredResults = isCreateMode 
        ? searchResults.filter(ride => ride.owner === principal)
        : searchResults;
      
      setSearchMode(true);
      setAvailableRides(filteredResults);
      setMatchingRides([]);

    } catch (error) {
      console.error("Failed to search rides:", error);
      alert("Failed to search rides. Please try again.");
      setAvailableRides([]);
    }
    setIsLoading(false);
  };

  // Add this new handler
  const handleStartRide = (index) => {
    console.log(`Starting ride ${index}`);
    // Add your ride start logic here
  };

  const calculatePerPersonCost = (ride) => {
    const TOTAL_RIDE_COST = 10; // Fixed total ride cost
    // Get number of current riders (excluding driver)
    const numRiders = ride.riders?.length || 1;
    // Calculate cost per person by dividing total cost by number of riders
    return Math.ceil(TOTAL_RIDE_COST / numRiders);
  };

  const handlePayForRide = async (ride) => {
    if (!ride.driver_id) {
      alert("No driver assigned to this ride yet.");
      return;
    }

    setIsLoading(true);
    try {
      const perPersonCost = calculatePerPersonCost(ride);
      // Ensure we're using the unwrapped driver_id value
      const driverId = ride.driver_id.toString();
      console.log("Paying driver:", driverId, "amount:", perPersonCost);
      
      const result = await payForRide(driverId, perPersonCost);
      if (result) {
        alert(`Payment of ${perPersonCost} tokens successful!`);
        await fetchBalance();
        await fetchRides();
      } else {
        alert("Payment failed. Please check your balance and try again.");
      }
    } catch (error) {
      console.error("Failed to pay for ride:", error);
      alert("Failed to process payment. Please try again.");
    }
    setIsLoading(false);
  };

  const handleDriverJoin = async (rideId) => {
    setIsLoading(true);
    try {
      const result = await driverJoin(rideId);
      if (result) {
        alert("Successfully joined as driver!");
        await fetchRides();
      } else {
        alert("Failed to join as driver. Please try again.");
      }
    } catch (error) {
      console.error("Failed to join as driver:", error);
      alert("Failed to join as driver. Please try again.");
    }
    setIsLoading(false);
  };

  // Update clear search function
  const clearSearch = () => {
    setFromLocation("");
    setToLocation("");
    setSearchMode(false);
    setMatchingRides([]);
    fetchRides(); // Fetch all rides again
  };

  // Update mode toggle handler to preserve search results
  const handleModeToggle = (createMode) => {
    setIsCreateMode(createMode);
    // Don't clear search state or fetch rides on mode toggle
  };

  // Add new function to find matching rides
  const findMatchingRides = (currentRide) => {
    if (!availableRides || !currentRide) return [];
    
    return availableRides.filter(ride => 
      ride.ride_id !== currentRide.ride_id && // Don't include the current ride
      ride.destination.toLowerCase() === currentRide.destination.toLowerCase() && // Same destination
      ride.status?.Open !== undefined && // Only open rides
      ride.owner !== principal && // Not owned by current user
      ride.riders.length < Number(ride.max_riders) // Has available seats
    );
  };

  // Update the ride card render to include matching rides
  const RideCard = ({ ride, isMainRide = true }) => {
    const perPersonCost = calculatePerPersonCost(ride);
    const canPay = ride.driver_id && 
                   ride.driver_id.length > 0 && 
                   ride.status?.Open !== undefined && 
                   ride.riders?.includes(principal);

    // Check if the ride is pending a driver
    const isDriverPending = !ride.driver_id || ride.driver_id.length === 0;

    return (
      <div className={`ride-card glass ${!isMainRide ? 'matching-ride' : ''}`}>
        <div className="ride-info">
          <h3>{ride.origin} to {ride.destination}</h3>
          <p>Available Seats: {Number(ride.max_riders) - (ride.riders?.length || 0)}</p>
          <p>Total Seats: {Number(ride.max_riders)}</p>
          <p>Created: {new Date(Number(ride.created_at) / 1000000).toLocaleString()}</p>
          <p>Driver Status: {
            isDriverPending ? (
              <span className="status-unassigned">Pending</span>
            ) : (
              <span className="status-assigned">Assigned</span>
            )}
          </p>
          <p>Status: {Object.keys(ride.status)[0]}</p>
          <p>Total Ride Cost: 10 RDT</p>
          {ride.riders?.length > 1 && (
            <p>Cost Split ({ride.riders.length} riders): {perPersonCost} RDT each</p>
          )}
          {ride.driver_id && ride.driver_id.length > 0 && ride.riders?.includes(principal) && (
            <p className="payment-info">Your share: {perPersonCost} RDT</p>
          )}
          {/* Show owner info if not the user's ride */}
          {ride.owner !== principal && <p>Posted by: {ride.owner}</p>}
        </div>
        <div className="ride-actions">
          {!isCreateMode && ride.status?.Open !== undefined && (
            <button
              className="book-btn glass"
              onClick={() => handleAcceptRide(ride.ride_id)}
              disabled={ride.riders?.includes(principal)}
            >
              {ride.riders?.includes(principal) 
                ? 'Already Joined' 
                : 'Join Ride'}
            </button>
          )}
          {/* Delete Button - Only show for owner's rides */}
          {ride.owner === principal && (
            <button
              className="book-btn glass"
              onClick={() => handleDeleteRide(ride.ride_id)}
              disabled={isLoading}
            >
              Delete Ride
            </button>
          )}
          {/* Only show payment button when driver is assigned and user is a rider */}
          {canPay && (
            <button
              className="pay-btn glass"
              onClick={() => handlePayForRide(ride)}
              disabled={isLoading}
            >
              Pay {perPersonCost} RDT
            </button>
          )}
        </div>
        {/* Remove nested matching rides from here to prevent overlapping */}
        {isMainRide && !isCreateMode && ride.owner !== principal && (
          <div className="matching-rides-section">
            <h4>Similar Rides to {ride.destination}</h4>
            <div className="matching-rides-grid">
              {findMatchingRides(ride).map(matchingRide => (
                <RideCard 
                  key={matchingRide.ride_id} 
                  ride={matchingRide} 
                  isMainRide={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const navigateToDriverDashboard = () => {
    navigate('/driver-dashboard');
  };

  return (
    <div className="home">
      <nav className="navbar glass">
        <div className="logo">
          Instant Car Pool <span className="icp-text">(ICP)</span>
        </div>
        <div className="nav-links">
          <span className="token-balance glass">
            <i className="fas fa-coins"></i> {tokenBalance} RDT
          </span>
          <div className="token-purchase glass">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="token-input"
            />
            <button 
              className="wallet-btn glass" 
              onClick={handleBuyTokens}
              disabled={!amount || isLoading}
            >
              {isLoading ? "Buying..." : "Buy RDT"}
            </button>
          </div>
          <button
            className="wallet-btn glass"
            onClick={() => alert("Coming Soon!")}
          >
            View Previous Rides
          </button>
          <button
            className="switch-mode-btn glass"
            onClick={navigateToDriverDashboard}
          >
            Switch to Driver Mode
          </button>
          <button className="logout-btn glass" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content glass">
        <h1>Welcome, User!</h1>
        <div className="mode-toggle">
          <button
            className={`toggle-btn glass ${!isCreateMode ? "active" : ""}`}
            onClick={() => handleModeToggle(false)}
          >
            Find a Ride
          </button>
          <button
            className={`toggle-btn glass ${isCreateMode ? "active" : ""}`}
            onClick={() => handleModeToggle(true)}
          >
            Create a Ride
          </button>
        </div>
        <div className="search-ride-section">
          {!isCreateMode ? (
            <div className="search-container glass">
              <input
                type="text"
                placeholder="From"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
              <input
                type="text"
                placeholder="To"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
              <button
                className="search-btn glass"
                onClick={handleSearchRides}
              >
                Search Rides
              </button>
              {(fromLocation || toLocation) && (
                <button
                  className="clear-btn glass"
                  onClick={clearSearch}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="create-ride-container glass">
              <form onSubmit={handleCreateRide}>
                <input
                  type="text"
                  placeholder="From"
                  value={rideDetails.from}
                  onChange={(e) =>
                    setRideDetails({ ...rideDetails, from: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="To"
                  value={rideDetails.to}
                  onChange={(e) =>
                    setRideDetails({ ...rideDetails, to: e.target.value })
                  }
                />
                {/* <input
                  type="time"
                  value={rideDetails.time}
                  onChange={(e) =>
                    setRideDetails({ ...rideDetails, time: e.target.value })
                  }
                /> */}
                <input
                  type="number"
                  placeholder="Maximum Seats"
                  value={rideDetails.seats}
                  onChange={(e) =>
                    setRideDetails({ ...rideDetails, seats: e.target.value })
                  }
                />
                <button type="submit" className="create-btn glass">
                  Create Ride
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="available-rides">
          <h2>
            {isCreateMode 
              ? "Your Created Rides" 
              : searchMode 
                ? `Search Results (${availableRides.length})` 
                : "Available Rides"}
          </h2>
          <div className="rides-container">
            {isLoading ? (
              <div className="loading">Loading rides...</div>
            ) : availableRides.length === 0 ? (
              <div className="no-rides">
                {isCreateMode 
                  ? "You haven't created any rides yet."
                  : searchMode
                    ? "No rides found matching your search criteria."
                    : "No available rides found."}
              </div>
            ) : (
              availableRides.map((ride) => (
                <RideCard key={ride.ride_id} ride={ride} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHome;
