/**
 * REAL-TIME USER MANAGEMENT SYSTEM IMPLEMENTATION
 * 
 * This document outlines the comprehensive real-time user management system
 * implemented for the Zero-Day Attack Detection System.
 * 
 * FEATURES IMPLEMENTED:
 * 
 * 1. REAL-TIME DATA INTEGRATION:
 *    - Fetches all users from MySQL database via backend API
 *    - Auto-refresh every 30 seconds for real-time updates
 *    - Manual refresh button with loading states
 *    - Live pagination and filtering
 * 
 * 2. ADMIN OPERATIONS WITH DATABASE PERSISTENCE:
 *    - Approve User: Updates user status to 'approved' in database
 *    - Reject User: Updates user status to 'rejected' in database
 *    - Delete User: Permanently removes user record from database
 *    - Invite User: Creates new user with 'approved' status
 * 
 * 3. INVITE/CREATE USER FUNCTIONALITY:
 *    - Modal dialog with form validation
 *    - Creates users with immediate approved status
 *    - Supports both 'user' and 'admin' role assignment
 *    - Password hashing and security handled by backend
 * 
 * 4. REAL-TIME UI UPDATES:
 *    - Loading states for all operations
 *    - Instant feedback with toast notifications
 *    - Live statistics updates (approved, pending, admin counts)
 *    - Search and filter capabilities
 * 
 * 5. SECURITY FEATURES:
 *    - Prevents admins from deleting their own accounts
 *    - Role-based access control at multiple levels
 *    - Input validation and sanitization
 *    - Audit logging for all admin actions
 * 
 * 6. USER EXPERIENCE ENHANCEMENTS:
 *    - Responsive design for mobile and desktop
 *    - Clear visual indicators for user status
 *    - Contextual action buttons based on user status
 *    - Search functionality across username and email
 * 
 * API ENDPOINTS UTILIZED:
 * - GET /api/admin/users - Fetch all users with pagination
 * - PUT /api/admin/users/:id/approve - Approve user registration
 * - PUT /api/admin/users/:id/reject - Reject user registration
 * - DELETE /api/admin/users/:id - Delete user permanently
 * - POST /api/admin/users/invite - Create/invite new user
 * 
 * DATABASE OPERATIONS:
 * - All operations update the MySQL users table immediately
 * - Audit logs are created for every admin action
 * - Foreign key constraints maintain data integrity
 * - Soft delete not implemented - hard delete for security
 * 
 * REAL-TIME FEATURES:
 * - Auto-refresh every 30 seconds
 * - Immediate UI updates after any operation
 * - Live status indicators and counters
 * - Real-time search and filtering
 * 
 * IMPLEMENTATION FILES:
 * - frontend/src/pages/Users.tsx - Main user management interface
 * - frontend/src/services/api.ts - API client with admin endpoints
 * - backend/routes/admin.js - Backend admin routes and database operations
 * - backend/config/database.js - MySQL connection and query execution
 * 
 * USAGE:
 * 1. Admin logs in and navigates to Users page
 * 2. System auto-loads all users from database
 * 3. Admin can approve/reject pending registrations
 * 4. Admin can delete approved users (except self)
 * 5. Admin can create new users with immediate approval
 * 6. All changes are immediately reflected in database and UI
 * 7. System auto-refreshes to show changes from other admin sessions
 */
