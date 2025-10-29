export const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "VoteSphere API",
        version: "1.0.0",
        description: "API documentation for VoteSphere",
      },
      servers: [
        {
          url: "http://localhost:5000", // or your deployed URL
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ["./routes/*.js"], // adjust this path to where your route files are
  };
  