# API Documentation - Secure Login Demo

This document outlines all the API endpoints available in the Secure Login Demo application, including their request/response formats and associated security vulnerabilities.

## Table of Contents

- [Authentication Routes](#authentication-routes)
  - [Login User](#login-user)
  - [Register User](#register-user)
  - [Logout User](#logout-user)
- [Dashboard Routes](#dashboard-routes)
  - [Get Dashboard Statistics](#get-dashboard-statistics)
  - [Get User Notes](#get-user-notes)
- [Admin Routes](#admin-routes)
  - [Get All Users](#get-all-users)
  - [Create Database Backup](#create-database-backup)
- [Vulnerability Summary](#vulnerability-summary)
## Authentication Routes

### Login User

Authenticates a user and returns user information.

- **URL**: `/api/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "isAdmin": true
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Invalid credentials"
  }
  ```
- **Notes**: 
  - Vulnerable to SQL injection by design
  - Uses MD5 for password hashing (insecure)

### Register User

Creates a new user account.

- **URL**: `/api/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": 3,
      "username": "newuser",
      "email": "newuser@example.com",
      "isAdmin": false
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Registration failed",
    "details": "SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username"
  }
  ```

### Logout User

Logs out the current user by clearing cookies.

- **URL**: `/api/logout`
- **Method**: `GET`
- **Success Response**:
  ```json
  {
    "success": true
  }
  ```

## Dashboard Routes

### Get Dashboard Statistics

Retrieves statistics about the database.

- **URL**: `/api/dashboard/stats`
- **Method**: `GET`
- **Success Response**:
  ```json
  {
    "tables": ["users", "notes"],
    "userCount": 2,
    "noteCount": 3
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Database error",
    "details": "Error message"
  }
  ```
- **Notes**:
  - Missing authentication check by design (A01: Broken Access Control)

### Get User Notes

Retrieves notes for the current user.

- **URL**: `/api/notes`
- **Method**: `GET`
- **Success Response**:
  ```json
  [
    {
      "id": 1,
      "user_id": 1,
      "title": "Welcome Note",
      "content": "Welcome to the dashboard! This is a sample note.",
      "created_at": "2023-04-04 12:34:56"
    },
    {
      "id": 2,
      "user_id": 1,
      "title": "Security Reminder",
      "content": "Remember to change your default password.",
      "created_at": "2023-04-04 12:35:56"
    }
  ]
  ```
- **Error Response**:
  ```json
  {
    "error": "Database error",
    "details": "Error message"
  }
  ```
- **Notes**:
  - For admin users, returns all notes with username
  - For regular users, returns only their notes
  - Vulnerable to SQL injection by design if userId is manipulated

## Admin Routes

### Get All Users

Retrieves information about all users (admin only).

- **URL**: `/api/admin/users`
- **Method**: `GET`
- **Success Response**:
  ```json
  [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "is_admin": 1
    },
    {
      "id": 2,
      "username": "user",
      "email": "user@example.com",
      "is_admin": 0
    }
  ]
  ```
- **Error Response**:
  ```json
  {
    "error": "Database error"
  }
  ```
  or
  ```json
  {
    "error": "Not authorized"
  }
  ```
- **Notes**:
  - Should only be accessible by admin users
  - Authorization check is done after data is fetched (A01: Broken Access Control)

### Create Database Backup

Creates a backup of the database (admin only).

- **URL**: `/api/admin/backup-db`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "filename": "backup_20230404"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "filename": "backup_20230404.sql"
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Backup failed",
    "details": "Error message"
  }
  ```
  or
  ```json
  {
    "error": "Admin access required"
  }
  ```
- **Notes**:
  - Vulnerable to command injection by design (A03: Injection)
  - Should only be accessible by admin users

## Vulnerability Summary

This application intentionally contains vulnerabilities from the OWASP Top 10 list for educational purposes:

1. **A01: Broken Access Control**
   - `/api/dashboard/stats` - No authentication check
   - `/api/admin/users` - Access control check after data is fetched
   - Client-side admin checks that can be bypassed

2. **A02: Cryptographic Failures**
   - MD5 password hashing (weak and outdated)
   - Hardcoded database credentials in application code

3. **A03: Injection**
   - SQL Injection in login:
     - Example: `username=admin'--` and any password
   - SQL Injection in notes endpoint if userId is manipulated
   - Command Injection in backup endpoint:
     - Example: `filename=backup;ls` to execute commands
