import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

type SchemaType = {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
};

export const validate = (schemas: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        return res.status(400).json({
          type: "body",
          errors: error.details.map((e) => e.message),
        });
      }

      req.body = value;
    }

    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
      });

      if (error) {
        return res.status(400).json({
          type: "query",
          errors: error.details.map((e) => e.message),
        });
      }

      req.query = value as any;
    }

    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        return res.status(400).json({
          type: "params",
          errors: error.details.map((e) => e.message),
        });
      }

      req.params = value;
    }

    next();
  };
};