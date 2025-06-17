
# Travel Discovery App - API Documentation

## Overview

This document provides comprehensive documentation for the Travel Discovery App API, built on Supabase with PostgreSQL and real-time capabilities.

## Base URL

```
https://hrmklsvewmhpqixgyjmy.supabase.co/rest/v1
```

## Authentication

All API requests require authentication using Bearer tokens:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Rate Limiting

- **Rate Limit**: 100 requests per minute per user
- **Burst Limit**: 200 requests in a 5-minute window

## API Endpoints

### Authentication

#### Sign Up
```http
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "data": {
    "username": "traveler123",
    "full_name": "John Doe"
  }
}
```

#### Sign In
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Locations

#### Get Locations
```http
GET /locations?city=eq.New York&limit=20&offset=0
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `city` - Filter by city name
- `category` - Filter by location category
- `limit` - Number of results (max 100)
- `offset` - Pagination offset

**Response:**
```json
[
  {
    "id": "uuid-here",
    "name": "Central Park",
    "description": "Large public park in Manhattan",
    "category": "Park",
    "address": "Central Park, New York, NY",
    "city": "New York",
    "latitude": 40.785091,
    "longitude": -73.968285,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Location
```http
POST /locations
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Joe's Pizza",
  "description": "Best pizza in town",
  "category": "Restaurant",
  "address": "123 Main St, New York, NY",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

### User Profiles

#### Get Profile
```http
GET /profiles?id=eq.USER_ID
Authorization: Bearer YOUR_TOKEN
```

#### Update Profile
```http
PATCH /profiles?id=eq.USER_ID
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "full_name": "Updated Name",
  "bio": "Travel enthusiast",
  "current_city": "New York"
}
```

### Analytics

#### Track Event
```http
POST /user_analytics
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "event_type": "page_view",
  "event_data": {
    "page": "/explore"
  },
  "page_url": "/explore"
}
```

#### Log Performance Metric
```http
POST /performance_metrics
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "metric_type": "page_load",
  "metric_value": 1250,
  "metric_unit": "ms",
  "endpoint": "/explore"
}
```

## Real-time Subscriptions

### Subscribe to Location Updates
```javascript
import { supabase } from './supabase'

const subscription = supabase
  .channel('locations')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'locations'
  }, (payload) => {
    console.log('New location:', payload.new)
  })
  .subscribe()
```

### Subscribe to User Analytics
```javascript
const analyticsSubscription = supabase
  .channel('analytics')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'user_analytics',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New analytics event:', payload.new)
  })
  .subscribe()
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": {
    "message": "Description of the error",
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Data Types

### Location Object
```typescript
interface Location {
  id: string;
  name: string;
  description?: string;
  category: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  pioneer_user_id?: string;
}
```

### Profile Object
```typescript
interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  current_city?: string;
  follower_count: number;
  following_count: number;
  places_visited: number;
  cities_visited: number;
  user_type: 'free' | 'premium' | 'business';
  is_business_user: boolean;
  business_verified: boolean;
}
```

## SDK Usage Examples

### JavaScript/TypeScript
```javascript
import { supabase } from '@/lib/supabase'

// Get locations
const { data: locations, error } = await supabase
  .from('locations')
  .select('*')
  .eq('city', 'New York')
  .limit(20)

// Create location
const { data: newLocation, error } = await supabase
  .from('locations')
  .insert({
    name: 'New Restaurant',
    category: 'Restaurant',
    city: 'New York'
  })
  .select()
  .single()

// Track analytics
const { error } = await supabase
  .from('user_analytics')
  .insert({
    event_type: 'place_interaction',
    event_data: { place_id: 'uuid', action: 'like' }
  })
```

## Testing

### Using curl
```bash
# Get locations
curl -X GET "https://hrmklsvewmhpqixgyjmy.supabase.co/rest/v1/locations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"

# Create location
curl -X POST "https://hrmklsvewmhpqixgyjmy.supabase.co/rest/v1/locations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Location",
    "category": "Restaurant",
    "city": "New York"
  }'
```

### Postman Collection

A complete Postman collection is available at `/public/api-documentation.json` which includes:
- All API endpoints
- Example requests and responses
- Environment variables for easy testing
- Authentication setup

## Monitoring & Analytics

The API includes built-in monitoring and analytics:

### Tracked Metrics
- **User Events**: Page views, interactions, searches
- **Performance**: API response times, page load times
- **Errors**: Application errors, failed requests
- **Usage**: Endpoint popularity, user behavior patterns

### Dashboard Access
Analytics dashboard is available at `/analytics` for authenticated admin users.

## Support

For API support, please contact:
- **Email**: api-support@traveldiscovery.com
- **Documentation**: [API Docs](./public/api-documentation.json)
- **Status Page**: [Status](https://status.traveldiscovery.com)

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication system
- Location management
- User profiles
- Analytics tracking
- Real-time subscriptions
