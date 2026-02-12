import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/DriverHome.css";

function DriverHome() {
  const navigate = useNavigate();
  const { actor, isAuthenticated, principal, getAllRides, postRide, getBalance, driverJoin, checkDriverRewards } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [rides, setRides] = useState([]);
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [filteredRides, setFilteredRides] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRide, setNewRide] = useState({
    from: "",
    to: "",
    seats: "",
  });
  const [showLoyaltyPopup, setShowLoyaltyPopup] = useState(false);
  const [loyaltyStatus, setLoyaltyStatus] = useState(null);

  useEffect(() => {
    if (isAuthenticated && actor) {
      fetchRidesAndBalance();
    }
  }, [isAuthenticated, actor]);

  const fetchRidesAndBalance = async () => {
    setIsLoading(true);
    try {
      const [allRides, balance] = await Promise.all([
        getAllRides(),
        getBalance()
      ]);

      console.log("All rides:", allRides);

      // Filter rides that need a driver
      const pendingRides = allRides.filter(ride => {
        // Check if driver_id is null, undefined, or an empty array
        const hasNoDriver = !ride.driver_id || 
                           (Array.isArray(ride.driver_id) && ride.driver_id.length === 0) ||
                           ride.driver_id === "";
                           
        const notOwnRide = ride.owner !== principal;
        const isOpenStatus = ride.status?.Open !== undefined;

        console.log("Analyzing ride:", {
          rideId: ride.ride_id,
          driverId: ride.driver_id,
          hasNoDriver,
          notOwnRide,
          isOpenStatus,
          owner: ride.owner,
          status: ride.status
        });

        return isOpenStatus && notOwnRide && hasNoDriver;
      });

      console.log("Pending rides found:", pendingRides);
      setRides(pendingRides);
      setTotalEarnings(balance);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setIsLoading(false);
  };

  const handleSearch = () => {
    const filtered = rides.filter((ride) => {
      const matchFrom = ride.origin.toLowerCase().includes(searchFrom.toLowerCase());
      const matchTo = ride.destination.toLowerCase().includes(searchTo.toLowerCase());
      return matchFrom && matchTo;
    });
    setFilteredRides(filtered);
  };

  const handleCreateRide = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Create ride with driver assignment since it's from DriverHome
      const rideId = await postRide(newRide.from, newRide.to, Number(newRide.seats), true);
      if (rideId) {
        setShowCreateForm(false);
        setNewRide({ from: "", to: "", seats: "" });
        await fetchRidesAndBalance();
        alert("Ride created and you're automatically assigned as driver!");
      }
    } catch (error) {
      console.error("Failed to create ride:", error);
      alert("Failed to create ride");
    }
    setIsLoading(false);
  };

  const handleJoinRide = async (rideId) => {
    setIsLoading(true);
    try {
      const result = await driverJoin(rideId);
      if (result) {
        alert("Successfully joined as driver!");
        await fetchRidesAndBalance();
      }
    } catch (error) {
      console.error("Failed to join ride:", error);
      alert("Failed to join ride");
    }
    setIsLoading(false);
  };

  const handleCheckLoyalty = async () => {
    setIsLoading(true);
    try {
      const result = await checkDriverRewards();
      setLoyaltyStatus(result);
      setShowLoyaltyPopup(true);
    } catch (error) {
      console.error("Failed to check loyalty status:", error);
      alert("Failed to check loyalty status");
    }
    setIsLoading(false);
  };

  const RideCard = ({ ride }) => (
    <div className="ride-item glass">
      <div className="ride-details">
        <h3>{ride.origin} to {ride.destination}</h3>
        <p>Created: {new Date(Number(ride.created_at) / 1000000).toLocaleString()}</p>
        <p>Total Seats: {ride.max_riders}</p>
        <p>Available Seats: {Number(ride.max_riders) - (ride.riders?.length || 0)}</p>
        <p>Posted by: {ride.owner}</p>
        <p>Current Riders: {ride.riders?.length || 0}</p>
        <p className="driver-status">
          <span className="status-unassigned">Needs Driver Assignment</span>
        </p>
      </div>
      <div className="ride-actions">
        <button
          onClick={() => handleJoinRide(ride.ride_id)}
          className="join-btn glass"
          disabled={isLoading}
        >
          Accept as Driver
        </button>
      </div>
    </div>
  );

  return (
    <div className="home">
      <nav className="navbar glass">
        <div className="logo">
          Instant Car Pool <span className="icp-text">(ICP)</span>
        </div>
        <div className="nav-links">
          <span className="token-balance glass">
            <i className="fas fa-coins"></i> {totalEarnings} RDT
          </span>
          <button 
            className="loyalty-btn glass" 
            onClick={handleCheckLoyalty}
            disabled={isLoading}
          >
            Check Loyalty Rewards
          </button>
          <button className="create-btn glass" onClick={() => setShowCreateForm(true)}>
            Create Ride
          </button>
          <button className="logout-btn glass" onClick={() => navigate("/")}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content glass">
        <h1>Welcome, Driver!</h1>
        <div className="search-container glass">
          <input
            type="text"
            placeholder="From Location"
            value={searchFrom}
            onChange={(e) => setSearchFrom(e.target.value)}
          />
          <input
            type="text"
            placeholder="To Location"
            value={searchTo}
            onChange={(e) => setSearchTo(e.target.value)}
          />
          <button className="search-btn glass" onClick={handleSearch}>
            Search
          </button>
          {(searchFrom || searchTo) && (
            <button className="clear-btn glass" onClick={() => {
              setSearchFrom("");
              setSearchTo("");
              setFilteredRides([]);
            }}>
              Clear
            </button>
          )}
        </div>

        <div className="available-rides">
          <h2>Available Rides</h2>
          {isLoading ? (
            <div className="loading">Loading rides...</div>
          ) : (
            <div className="rides-container">
              {(filteredRides.length > 0 ? filteredRides : rides).length === 0 ? (
                <div className="no-rides">No rides available</div>
              ) : (
                (filteredRides.length > 0 ? filteredRides : rides).map((ride) => (
                  <RideCard key={ride.ride_id} ride={ride} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="modal">
          <div className="modal-content glass">
            <h2>Create New Ride</h2>
            <form onSubmit={handleCreateRide}>
              <input
                type="text"
                placeholder="From Location"
                value={newRide.from}
                onChange={(e) => setNewRide({...newRide, from: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="To Location"
                value={newRide.to}
                onChange={(e) => setNewRide({...newRide, to: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Number of Seats"
                value={newRide.seats}
                onChange={(e) => setNewRide({...newRide, seats: e.target.value})}
                required
                min="1"
              />
              <div className="modal-actions">
                <button type="submit" className="create-btn glass" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Ride"}
                </button>
                <button 
                  type="button" 
                  className="cancel-btn glass"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLoyaltyPopup && (
        <div className="modal">
          <div className="modal-content glass">
            <h2>Driver Loyalty Status</h2>
            <div className="loyalty-info">
              {loyaltyStatus && <p>{loyaltyStatus}</p>}
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="close-btn glass"
                onClick={() => setShowLoyaltyPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverHome;
