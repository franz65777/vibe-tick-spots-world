
/**
 * API Documentation for Travel Discovery App
 * 
 * This file contains comprehensive documentation for all API endpoints and services
 * used in the Travel Discovery application.
 */

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: ApiParameter[];
  requestBody?: ApiSchema;
  responses: ApiResponse[];
  authentication?: boolean;
  examples: ApiExample[];
}

export interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: any;
}

export interface ApiSchema {
  type: string;
  properties: Record<string, ApiParameter>;
  required?: string[];
}

export interface ApiResponse {
  status: number;
  description: string;
  schema?: ApiSchema;
}

export interface ApiExample {
  title: string;
  request?: any;
  response?: any;
}

export const API_DOCUMENTATION: Record<string, ApiEndpoint[]> = {
  authentication: [
    {
      method: 'POST',
      path: '/auth/signup',
      description: 'Register a new user account',
      authentication: false,
      requestBody: {
        type: 'object',
        properties: {
          email: { name: 'email', type: 'string', required: true, description: 'User email address' },
          password: { name: 'password', type: 'string', required: true, description: 'User password (min 8 characters)' },
          username: { name: 'username', type: 'string', required: true, description: 'Unique username' },
          full_name: { name: 'full_name', type: 'string', required: false, description: 'User full name' }
        },
        required: ['email', 'password', 'username']
      },
      responses: [
        {
          status: 200,
          description: 'User successfully registered',
          schema: {
            type: 'object',
            properties: {
              user: { name: 'user', type: 'object', required: true, description: 'User object' },
              session: { name: 'session', type: 'object', required: true, description: 'Session object' }
            }
          }
        },
        {
          status: 400,
          description: 'Invalid input data'
        },
        {
          status: 409,
          description: 'User already exists'
        }
      ],
      examples: [
        {
          title: 'Successful Registration',
          request: {
            email: 'user@example.com',
            password: 'securepassword123',
            username: 'traveler123',
            full_name: 'John Doe'
          },
          response: {
            user: {
              id: 'uuid-here',
              email: 'user@example.com',
              username: 'traveler123',
              full_name: 'John Doe'
            },
            session: {
              access_token: 'token-here',
              refresh_token: 'refresh-token-here'
            }
          }
        }
      ]
    },
    {
      method: 'POST',
      path: '/auth/signin',
      description: 'Sign in an existing user',
      authentication: false,
      requestBody: {
        type: 'object',
        properties: {
          email: { name: 'email', type: 'string', required: true, description: 'User email address' },
          password: { name: 'password', type: 'string', required: true, description: 'User password' }
        },
        required: ['email', 'password']
      },
      responses: [
        {
          status: 200,
          description: 'User successfully signed in'
        },
        {
          status: 401,
          description: 'Invalid credentials'
        }
      ],
      examples: [
        {
          title: 'Successful Sign In',
          request: {
            email: 'user@example.com',
            password: 'securepassword123'
          },
          response: {
            user: {
              id: 'uuid-here',
              email: 'user@example.com',
              username: 'traveler123'
            },
            session: {
              access_token: 'token-here'
            }
          }
        }
      ]
    }
  ],

  locations: [
    {
      method: 'GET',
      path: '/locations',
      description: 'Get list of locations with optional filtering',
      authentication: true,
      parameters: [
        { name: 'city', type: 'string', required: false, description: 'Filter by city name' },
        { name: 'category', type: 'string', required: false, description: 'Filter by location category' },
        { name: 'limit', type: 'number', required: false, description: 'Number of results to return (default: 20)' },
        { name: 'offset', type: 'number', required: false, description: 'Number of results to skip (default: 0)' }
      ],
      responses: [
        {
          status: 200,
          description: 'List of locations retrieved successfully',
          schema: {
            type: 'array',
            properties: {
              id: { name: 'id', type: 'string', required: true, description: 'Location UUID' },
              name: { name: 'name', type: 'string', required: true, description: 'Location name' },
              description: { name: 'description', type: 'string', required: false, description: 'Location description' },
              category: { name: 'category', type: 'string', required: true, description: 'Location category' },
              address: { name: 'address', type: 'string', required: false, description: 'Location address' },
              city: { name: 'city', type: 'string', required: false, description: 'City name' },
              latitude: { name: 'latitude', type: 'number', required: false, description: 'Latitude coordinate' },
              longitude: { name: 'longitude', type: 'number', required: false, description: 'Longitude coordinate' }
            }
          }
        }
      ],
      examples: [
        {
          title: 'Get locations in New York',
          request: { city: 'New York', limit: 10 },
          response: [
            {
              id: 'uuid-1',
              name: 'Central Park',
              description: 'Large public park in Manhattan',
              category: 'Park',
              address: 'Central Park, New York, NY',
              city: 'New York',
              latitude: 40.785091,
              longitude: -73.968285
            }
          ]
        }
      ]
    },
    {
      method: 'POST',
      path: '/locations',
      description: 'Create a new location',
      authentication: true,
      requestBody: {
        type: 'object',
        properties: {
          name: { name: 'name', type: 'string', required: true, description: 'Location name' },
          description: { name: 'description', type: 'string', required: false, description: 'Location description' },
          category: { name: 'category', type: 'string', required: true, description: 'Location category' },
          address: { name: 'address', type: 'string', required: false, description: 'Location address' },
          city: { name: 'city', type: 'string', required: false, description: 'City name' },
          latitude: { name: 'latitude', type: 'number', required: false, description: 'Latitude coordinate' },
          longitude: { name: 'longitude', type: 'number', required: false, description: 'Longitude coordinate' }
        },
        required: ['name', 'category']
      },
      responses: [
        {
          status: 201,
          description: 'Location created successfully'
        },
        {
          status: 400,
          description: 'Invalid input data'
        }
      ],
      examples: [
        {
          title: 'Create new restaurant location',
          request: {
            name: 'Joe\'s Pizza',
            description: 'Best pizza in town',
            category: 'Restaurant',
            address: '123 Main St, New York, NY',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.0060
          },
          response: {
            id: 'new-uuid',
            name: 'Joe\'s Pizza',
            description: 'Best pizza in town',
            category: 'Restaurant',
            created_at: '2024-01-15T10:30:00Z'
          }
        }
      ]
    }
  ],

  analytics: [
    {
      method: 'POST',
      path: '/analytics/events',
      description: 'Track user analytics events',
      authentication: true,
      requestBody: {
        type: 'object',
        properties: {
          event_type: { name: 'event_type', type: 'string', required: true, description: 'Type of event being tracked' },
          event_data: { name: 'event_data', type: 'object', required: false, description: 'Additional event data' },
          page_url: { name: 'page_url', type: 'string', required: false, description: 'Current page URL' },
          session_id: { name: 'session_id', type: 'string', required: false, description: 'User session ID' }
        },
        required: ['event_type']
      },
      responses: [
        {
          status: 201,
          description: 'Event tracked successfully'
        },
        {
          status: 400,
          description: 'Invalid event data'
        }
      ],
      examples: [
        {
          title: 'Track page view event',
          request: {
            event_type: 'page_view',
            event_data: { page: '/explore' },
            page_url: '/explore'
          },
          response: {
            id: 'event-uuid',
            status: 'success'
          }
        }
      ]
    },
    {
      method: 'GET',
      path: '/analytics/dashboard',
      description: 'Get analytics dashboard data',
      authentication: true,
      parameters: [
        { name: 'timeRange', type: 'string', required: false, description: 'Time range for analytics (day, week, month)' }
      ],
      responses: [
        {
          status: 200,
          description: 'Analytics dashboard data retrieved successfully'
        }
      ],
      examples: [
        {
          title: 'Get weekly analytics',
          request: { timeRange: 'week' },
          response: {
            userEvents: [],
            performance: [],
            errors: [],
            apiUsage: []
          }
        }
      ]
    }
  ]
};

export class ApiDocumentationGenerator {
  // Generate OpenAPI/Swagger documentation
  generateOpenApiSpec(): any {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Travel Discovery App API',
        version: '1.0.0',
        description: 'API documentation for the Travel Discovery application',
        contact: {
          name: 'API Support',
          email: 'support@traveldiscovery.com'
        }
      },
      servers: [
        {
          url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/rest/v1',
          description: 'Production server'
        }
      ],
      paths: {},
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };

    // Convert our documentation format to OpenAPI format
    Object.entries(API_DOCUMENTATION).forEach(([category, endpoints]) => {
      endpoints.forEach(endpoint => {
        if (!openApiSpec.paths[endpoint.path]) {
          openApiSpec.paths[endpoint.path] = {};
        }
        
        openApiSpec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
          summary: endpoint.description,
          tags: [category],
          security: endpoint.authentication ? [{ bearerAuth: [] }] : [],
          parameters: endpoint.parameters?.map(param => ({
            name: param.name,
            in: 'query',
            required: param.required,
            description: param.description,
            schema: { type: param.type }
          })),
          requestBody: endpoint.requestBody ? {
            required: true,
            content: {
              'application/json': {
                schema: this.convertSchemaToOpenApi(endpoint.requestBody)
              }
            }
          } : undefined,
          responses: endpoint.responses.reduce((acc, response) => {
            acc[response.status] = {
              description: response.description,
              content: response.schema ? {
                'application/json': {
                  schema: this.convertSchemaToOpenApi(response.schema)
                }
              } : undefined
            };
            return acc;
          }, {} as any)
        };
      });
    });

    return openApiSpec;
  }

  private convertSchemaToOpenApi(schema: ApiSchema): any {
    return {
      type: schema.type,
      properties: Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        acc[key] = {
          type: prop.type,
          description: prop.description
        };
        return acc;
      }, {} as any),
      required: schema.required
    };
  }

  // Generate Postman collection
  generatePostmanCollection(): any {
    return {
      info: {
        name: 'Travel Discovery App API',
        description: 'Complete API collection for the Travel Discovery application',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: Object.entries(API_DOCUMENTATION).map(([category, endpoints]) => ({
        name: category,
        item: endpoints.map(endpoint => ({
          name: endpoint.description,
          request: {
            method: endpoint.method,
            header: endpoint.authentication ? [
              {
                key: 'Authorization',
                value: 'Bearer {{access_token}}',
                type: 'text'
              }
            ] : [],
            url: {
              raw: `{{base_url}}${endpoint.path}`,
              host: ['{{base_url}}'],
              path: endpoint.path.split('/').filter(Boolean)
            },
            body: endpoint.requestBody ? {
              mode: 'raw',
              raw: JSON.stringify(endpoint.examples[0]?.request || {}, null, 2),
              options: {
                raw: {
                  language: 'json'
                }
              }
            } : undefined
          },
          response: endpoint.examples.map(example => ({
            name: example.title,
            originalRequest: {
              method: endpoint.method,
              header: [],
              body: example.request ? {
                mode: 'raw',
                raw: JSON.stringify(example.request, null, 2)
              } : undefined,
              url: {
                raw: `{{base_url}}${endpoint.path}`,
                host: ['{{base_url}}'],
                path: endpoint.path.split('/').filter(Boolean)
              }
            },
            status: 'OK',
            code: 200,
            _postman_previewlanguage: 'json',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            cookie: [],
            body: JSON.stringify(example.response, null, 2)
          }))
        }))
      })),
      variable: [
        {
          key: 'base_url',
          value: 'https://hrmklsvewmhpqixgyjmy.supabase.co/rest/v1'
        },
        {
          key: 'access_token',
          value: 'your_access_token_here'
        }
      ]
    };
  }
}

export const apiDocumentationGenerator = new ApiDocumentationGenerator();
