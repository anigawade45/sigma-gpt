import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const Profile = () => {
  const { api } = useAuth();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/user/profile");
        setUser(res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile");
      }
    };
    fetchProfile();
  }, [api]);

  if (error) return <div className="error">{error}</div>;
  if (!user) return <div>Loading profile...</div>;

  return (
    <div className="profile">
      <h2>Profile</h2>
      <p><strong>Name:</strong> {user.name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</p>
    </div>
  );
};

export default Profile;
