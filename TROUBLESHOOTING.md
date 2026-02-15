# Troubleshooting Login Issues

## Default Admin Credentials

**Employee Code:** `HR001`

**Password Options:**
- `admin123` (if database was initialized with `init_db.py`)
- `hrpass123` (if tests were run and created the user)

## Common Issues

### 1. "An unexpected error occurred"

This usually means:
- Backend server is not running
- CORS is blocking the request
- API URL is incorrect

**Check:**
1. Is the backend running? Open `http://localhost:8000/docs` in your browser
2. Check `.env.local` has correct API URL:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
3. Check browser console (F12) for CORS errors

### 2. "Invalid employee code or password"

This means:
- User doesn't exist in database
- Wrong password
- User account is inactive

**Solution:** Initialize the database with default user:

```python
# In Python shell or script
from app.db.session import SessionLocal
from app.db.init_db import init_db

db = SessionLocal()
init_db(db)
db.close()
```

### 3. CORS Errors

If you see CORS errors in browser console:
- Check backend `.env` has: `ALLOWED_ORIGINS=*`
- Restart backend server after changing `.env`

### 4. Network Errors

- Ensure backend is running on port 8000
- Check firewall isn't blocking localhost:8000
- Try accessing `http://localhost:8000/api/v1/health` directly

## Quick Test

Test the login API directly:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emp_code": "HR001", "password": "admin123"}'
```

If this works, the issue is with the frontend. If not, check backend.
