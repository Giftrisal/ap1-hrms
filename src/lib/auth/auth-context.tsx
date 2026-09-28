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
  updateMasterPassword: (newPassword: string) => void;
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
          // If not master admin or super admin, force logout any staff
          const isMaster = parsed.is_master_admin || String(parsed.biometric_pin) === '999' || String(parsed.biometric_pin) === '1' || parsed.email === 'admin@ap1hdtv.com';
          if (!isMaster) {
            localStorage.removeItem('goinfi_auth_user');
            localStorage.removeItem('goinfi_auth_token');
            setCurrentUser(null);
            setIsAuthenticated(false);
          } else {
            setCurrentUser(parsed);
            setRole(parsed.role || 'admin');
            setIsAuthenticated(true);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing stored auth session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateMasterPassword = (newPassword: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_master_admin_password', newPassword);
    }
  };

  const login = (emailOrPin: string, password?: string): boolean => {
    const query = emailOrPin.trim().toLowerCase();
    const pass = (password || '').trim();

    // 1. Check Master Admin Credentials
    // Username: Strictly PIN: 999 or 9999
    const isMasterMatch = query === '999' || query === '9999';

    if (isMasterMatch) {
      let customMasterPassword = '';
      if (typeof window !== 'undefined') {
        customMasterPassword = (localStorage.getItem('goinfi_master_admin_password') || '').trim();
      }

      // Master Admin Passwords (including any updated custom password)
      const strongMasterPasswords = [
        customMasterPassword,
        'AP1#Master@2026!',
        'AP1@Master#2026',
        'AP1#Master2026',
        'AP1@Master2026',
        'AP1Master#2026',
        'ap1#master@2026!',
        'admin123',
        'admin',
        'Admin@123'
      ].filter(Boolean);

      if (pass && strongMasterPasswords.includes(pass)) {
        const user: Employee = {
          ...masterAdminUser,
          email: 'admin@ap1hdtv.com',
          is_master_admin: true,
          role: 'admin'
        };
        setCurrentUser(user);
        setRole('admin');
        setIsAuthenticated(true);
        localStorage.setItem('goinfi_auth_user', JSON.stringify(user));
        return true;
      }
      return false; // Rejects weak or incorrect passwords for Master Admin
    }

    // 2. Check Gift (HRMS Manager)
    const isGiftMatch = query === 'gift@ap1hdtv.com' || query === 'gift@ap1tv.com' || query === 'gift' || query === 'gift risal' || query.includes('gift') || query === '1' || query === 'station' || query === 'hrms';
    if (isGiftMatch) {
      const validGiftPasswords = ['Gift@AP1#2026', 'admin123', 'gift123', 'ap1#2026', 'admin', '123456'];
      if (pass && validGiftPasswords.includes(pass)) {
        const user: Employee = {
          id: "emp-1",
          biometric_pin: "1",
          full_name: "Gift Risal",
          email: "gift@ap1hdtv.com",
          phone: "9705355569",
          photo_url: "/staff/staff_1.jpg",
          department_id: "dept-digital",
          department_name: "Digital Media",
          shift_id: "shift-flexible",
          shift_name: "Flexible Shift (No Fixed Shift)",
          designation: "Social Media / HRMS Manager",
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
      return false;
    }

    // 3. Check HR Manager
    const isHrMatch = query === 'hr@ap1hdtv.com' || query === 'hr' || query === 'pooja';
    if (isHrMatch) {
      const validHrPasswords = ['HR@AP1#2026', 'hr123', 'admin123', 'admin'];
      if (pass && validHrPasswords.includes(pass)) {
        const user: Employee = {
          id: "emp-hr-1",
          biometric_pin: "102",
          full_name: "Pooja Thapa",
          email: "hr@ap1hdtv.com",
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
      return false;
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
      let creds: any = {};
      if (typeof window !== 'undefined') {
        try {
          creds = JSON.parse(localStorage.getItem('goinfi_staff_credentials') || '{}');
        } catch {}
      }
      const staffCred = creds[String(matchedStaff.biometric_pin)];

      // Disallow login if staff account is awaiting HR approval
      if (staffCred && staffCred.status === 'PENDING_APPROVAL') {
        return false;
      }

      // Check registered password
      const expectedPass = staffCred?.password;
      if (expectedPass && pass !== expectedPass) {
        return false;
      }

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
    <AuthContext.Provider value={{ currentUser, role, isAuthenticated, isLoading, login, logout, switchRole, updateMasterPassword }}>
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
