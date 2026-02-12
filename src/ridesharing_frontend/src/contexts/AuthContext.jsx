import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory, canisterId } from "declarations/ridesharing_backend";
import { Principal } from "@dfinity/principal";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [actor, setActor] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState(null);

  const initializeAuthClient = async () => {
    try {
      const authClient = await AuthClient.create();
      if (await authClient.isAuthenticated()) {
        const identity = authClient.getIdentity();
        const agent = new HttpAgent({ identity });
        
        // Check if we're in development
        if (process.env.NODE_ENV !== "production") {
          await agent.fetchRootKey();
        }

        const newActor = Actor.createActor(idlFactory, {
          agent,
          canisterId: canisterId,
        });

        // Test the connection
        try {
          // Attempt a simple call to verify the actor is working
          await newActor.get_name();
          setActor(newActor);
          setPrincipal(identity.getPrincipal().toText());
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Actor verification failed:", error);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setIsAuthenticated(false);
    }
  };

  const loginWithInternetIdentity = async () => {
    try {
      const authClient = await AuthClient.create();
      return new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: "https://identity.ic0.app/",
          onSuccess: async () => {
            const identity = authClient.getIdentity();
            const agent = new HttpAgent({ identity });
            
            if (process.env.NODE_ENV !== "production") {
              await agent.fetchRootKey();
            }

            const newActor = Actor.createActor(idlFactory, {
              agent,
              canisterId: canisterId,
            });

            setActor(newActor);
            setPrincipal(identity.getPrincipal().toText());
            setIsAuthenticated(true);
            localStorage.setItem('isAuthenticated', 'true');
            resolve(newActor);
          },
          onError: reject,
        });
      });
    } catch (error) {
      console.error("II login failed:", error);
      return null;
    }
  };

  const loginWithPlug = async () => {
    if (!(window.ic && window.ic.plug)) {
      alert("Plug Wallet not installed!");
      return null;
    }

    try {
      const connected = await window.ic.plug.requestConnect();
      if (connected) {
        const plugActor = await window.ic.plug.createActor({
          canisterId: canisterId,
          interfaceFactory: idlFactory,
        });
        setActor(plugActor);
        const principal = await window.ic.plug.getPrincipal();
        setPrincipal(principal.toText());
        setIsAuthenticated(true);
        return plugActor;
      }
    } catch (error) {
      console.error("Plug login failed:", error);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setActor(null);
    setIsAuthenticated(false);
    setPrincipal(null);
  };

  const postRide = async (origin, destination, maxRiders, isDriverCreated = false) => {
    if (!actor || !principal) return null;
    try {
      const maxRidersNumber = Number(maxRiders);
      if (isNaN(maxRidersNumber) || maxRidersNumber <= 0) {
        throw new Error("Invalid number of seats");
      }

      const rideId = await actor.post_ride(
        principal,                // user_id
        origin.toString(),        // origin
        destination.toString(),   // destination
        BigInt(maxRidersNumber), // max_riders
        isDriverCreated          // is_driver_created
      );
      
      console.log("Created ride with ID:", rideId);
      return rideId;
    } catch (error) {
      console.error("Failed to post ride:", error);
      return null;
    }
  };

  const getAllRides = async () => {
    if (!actor) return [];
    try {
      const rides = await actor.get_all_rides();
      console.log("Fetched rides:", rides);
      return rides;
    } catch (error) {
      console.error("Failed to fetch rides:", error);
      return [];
    }
  };

  const searchRides = async (origin, destination) => {
    if (!actor) return [];
    try {
      console.log("Searching rides with:", { origin, destination });
      const rides = await actor.search_rides(
        origin ? [origin] : [], 
        destination ? [destination] : [], 
        [{ Open: null }]
      );
      console.log("Search results:", rides);
      return rides;
    } catch (error) {
      console.error("Failed to search rides:", error);
      return [];
    }
  };

  const requestToJoin = async (rideId) => {
    if (!actor || !principal) return null;
    try {
      return await actor.request_to_join(rideId, principal);
    } catch (error) {
      console.error("Failed to join ride:", error);
      return null;
    }
  };

  const buyTokens = async (amount) => {
    if (!actor) return null;
    try {
      console.log("Buying tokens:", amount);
      const result = await actor.buy_tokens(BigInt(amount));
      console.log("Buy tokens result:", result);
      return result;
    } catch (error) {
      console.error("Failed to buy tokens:", error);
      return null;
    }
  };

  const getBalance = async () => {
    if (!actor || !principal) return 0;
    try {
      console.log("Fetching balance for principal:", principal);
      const balance = await actor.get_balance(Principal.fromText(principal));
      console.log("Current balance:", Number(balance));
      return Number(balance);
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  };

  const cancelRide = async (rideId) => {
    if (!actor || !principal) return null;
    try {
      return await actor.cancel_ride(rideId, principal);
    } catch (error) {
      console.error("Failed to cancel ride:", error);
      return null;
    }
  };

  const payForRide = async (driverId, amount) => {
    if (!actor || !principal) return null;
    try {
      console.log("Paying for ride:", { driverId, amount });
      
      // Ensure driverId is a string and properly formatted
      const driverIdString = driverId.toString();
      console.log("Driver ID string:", driverIdString);
      
      try {
        const driverPrincipal = Principal.fromText(driverIdString);
        const result = await actor.pay_for_ride(driverPrincipal, BigInt(amount));
        console.log("Payment result:", result);
        return result;
      } catch (error) {
        console.error("Failed to convert driver ID to Principal:", error);
        return null;
      }
    } catch (error) {
      console.error("Failed to pay for ride:", error);
      return null;
    }
  };

  const driverJoin = async (rideId) => {
    if (!actor || !principal) return null;
    try {
      console.log("Driver joining ride:", rideId);
      const result = await actor.driver_join(rideId, principal);
      console.log("Driver join result:", result);
      return result;
    } catch (error) {
      console.error("Failed to join as driver:", error);
      return null;
    }
  };

  const checkDriverRewards = async () => {
    if (!actor || !principal) return null;
    try {
      return await actor.check_driver_rewards(principal);
    } catch (error) {
      console.error("Failed to check driver rewards:", error);
      return null;
    }
  };

  useEffect(() => {
    if (localStorage.getItem('isAuthenticated')) {
      initializeAuthClient();
    }
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        actor, 
        isAuthenticated, 
        principal, 
        loginWithInternetIdentity,
        loginWithPlug,
        logout,
        postRide,
        getAllRides,
        searchRides,
        requestToJoin,
        buyTokens,
        getBalance,
        cancelRide,
        payForRide,
        driverJoin,
        checkDriverRewards,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
