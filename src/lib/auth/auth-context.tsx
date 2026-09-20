'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';
import { masterAdminUser, initialEmployees } from '../mock-data';

interface AuthContextType {
  currentUser: Employee | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPin: string, password?: string) => boolean;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [role, setRole] = useState<UserRole>('admin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read stored authentication session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('goinfi_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
          setRole(parsed.role || 'admin');
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error('Error parsing stored auth session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (emailOrPin: string, password?: string): boolean => {
    const query = emailOrPin.trim().toLowerCase();
    const pass = (password || '').trim();

    // 1. Check Master Admin Credentials
    // Username: admin@ap1.tv, master@ap1.tv, admin, master, 999
    const isMasterMatch = 
      query === 'admin@ap1.tv' || 
      query === 'master@ap1.tv' || 
      query === 'admin' || 
      query === 'master' || 
      query === '999';

    if (isMasterMatch) {
      // Allow passwords: admin123, admin, ap1@admin2026, ap12026, 123456
      const validPasswords = ['admin123', 'admin', 'ap1@admin2026', 'ap12026', '123456', 'ap1admin'];
      if (!pass || validPasswords.includes(pass) || pass.length >= 4) {
        const user: Employee = {
          ...masterAdminUser,
          is_master_admin: true,
          role: 'admin'
        };
        setCurrentUser(user);
        setRole('admin');
        setIsAuthenticated(true);
        localStorage.setItem('goinfi_auth_user', JSON.stringify(user));
        return true;
      }
    }

    // 2. Check Gift (Station Manager / Operations Admin)
    const isGiftMatch = query === 'gift@ap1tv.com' || query === 'gift' || query === '1' || query === 'station';
    if (isGiftMatch) {
      const user: Employee = {
        id: "emp-1",
        biometric_pin: "1",
        full_name: "Gift",
        email: "gift@ap1tv.com",
        phone: "9705355569",
        photo_url: "",
        department_id: "dept-6",
        department_name: "Operations & Broadcasting",
        shift_id: "shift-day",
        shift_name: "Day Shift (10:00 AM - 6:00 PM)",
        designation: "Station Manager / Operations",
        role: "admin",
        status: "active",
        join_date: "2024-01-01",
        base_salary: 85000,
        is_master_admin: false
      };
      setCurrentUser(user);
      setRole('admin');
      setIsAuthenticated(true);
      localStorage.setItem('goinfi_auth_user', JSON.stringify(user));
      return true;
    }

    // 3. Check HR Manager
    const isHrMatch = query === 'hr@ap1.tv' || query === 'hr' || query === 'pooja';
    if (isHrMatch) {
      const user: Employee = {
        id: "emp-hr-1",
        biometric_pin: "102",
        full_name: "Pooja Thapa",
        email: "hr@ap1.tv",
        phone: "+977-9841234567",
        photo_url: "",
        department_id: "dept-2",
        department_name: "Human Resources",
        shift_id: "shift-day",
        shift_name: "Day Shift (10:00 AM - 6:00 PM)",
        designation: "HR Operations Manager",
        role: "hr",
        status: "active",
        join_date: "2023-06-01",
        base_salary: 75000,
        is_master_admin: false
      };
      setCurrentUser(user);
      setRole('hr');
      setIsAuthenticated(true);
      localStorage.setItem('goinfi_auth_user', JSON.stringify(user));
      return true;
    }

    // 4. Check Registered Staff in System (localStorage or initialEmployees)
    let staffList = initialEmployees;
    if (typeof window !== 'undefined') {
      const savedList = localStorage.getItem('goinfi_staff_list');
      if (savedList) {
        try {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            staffList = parsed;
          }
        } catch (e) {}
      }
    }

    const matchedStaff = staffList.find(e => 
      e.email?.toLowerCase() === query || 
      e.biometric_pin === query || 
      e.phone === query ||
      e.full_name?.toLowerCase() === query
    );

    if (matchedStaff) {
      setCurrentUser(matchedStaff);
      setRole(matchedStaff.role || 'employee');
      setIsAuthenticated(true);
      localStorage.setItem('goinfi_auth_user', JSON.stringify(matchedStaff));
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('goinfi_auth_user');
      localStorage.removeItem('goinfi_auth_token');
      // Direct hard redirect to ensure clean slate across all tabs/routes
      window.location.href = '/login';
    }
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (currentUser) {
      const updated = { ...currentUser, role: newRole };
      setCurrentUser(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_auth_user', JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, role, isAuthenticated, isLoading, login, logout, switchRole }}>
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
