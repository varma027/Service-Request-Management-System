import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.getUsers();
        if (res.success && res.data.length > 0) {
          setUsers(res.data);
          // Default to first requester (Alice Johnson)
          const defaultUser = res.data.find(u => u.role === 'requester') || res.data[0];
          setCurrentUser(defaultUser);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const switchUser = (userId) => {
    const user = users.find(u => u.id === Number(userId));
    if (user) {
      setCurrentUser(user);
    }
  };

  const isRequester = currentUser?.role === 'requester';
  const isManager = currentUser?.role === 'manager';
  const isItApprover = currentUser?.role === 'it_approver';
  const isFulfiller = currentUser?.role === 'fulfiller';

  return (
    <UserContext.Provider value={{
      users,
      currentUser,
      switchUser,
      loading,
      isRequester,
      isManager,
      isItApprover,
      isFulfiller
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
