'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';

interface AuthContextType {
  currentUser: Employee | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (emailOrPin: string, password?: string) => boolean;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const defaultAdminUser: Employee = {
  id: '101-uuid',
  biometric_pin: '101',
  full_name: 'Aayush Shrestha',
  email: 'aayush.s@goinfi.com',
  phone: '+977-9841100101',
  photo_url: '',
  department_id: 'a1111111-1111-1111-1111-111111111111',
  department_name: 'Executive Management',
  shift_id: '11111111-1111-1111-1111-111111111111',
  shift_name: 'Regular Morning Shift',
  designation: 'Chief Executive Officer',
  role: 'admin',
  status: 'active',
  join_date: '2022-01-01',
  base_salary: 125000,
  pan_number: 'PAN60129381',
  bank_name: 'NIC Asia Bank',
  bank_account_number: '10928374829101'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(defaultAdminUser);
  const [role, setRole] = useState<UserRole>('admin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('goinfi_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        setRole(parsed.role || 'admin');
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }
  }, []);

  const login = (emailOrPin: string, password?: string) => {
    // Standard PIN or password check (e.g. admin123 or machine pin)
    if (password && password !== 'admin123' && password !== 'hr123' && password !== 'goinfi2026') {
      // allow flexible demo login
    }
    const user = { ...defaultAdminUser };
    if (emailOrPin.toLowerCase().includes('hr')) {
      user.full_name = 'Pooja Thapa';
      user.role = 'hr';
      user.designation = 'HR Manager';
    } else if (emailOrPin.toLowerCase().includes('emp') || emailOrPin === '105') {
      user.full_name = 'Rohan Karki';
      user.role = 'employee';
      user.designation = 'Frontend Developer';
    }
    setCurrentUser(user);
    setRole(user.role);
    setIsAuthenticated(true);
    localStorage.setItem('goinfi_auth_user', JSON.stringify(user));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('goinfi_auth_user');
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (currentUser) {
      const updated = { ...currentUser, role: newRole };
      setCurrentUser(updated);
      localStorage.setItem('goinfi_auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, role, isAuthenticated, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
