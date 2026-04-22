export const validate = (schemas) => {
    return (req, res, next) => {
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
            Object.assign(req.body, value);
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
            Object.assign(req.query, value);
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
            Object.assign(req.params, value);
        }
        next();
    };
};
//# sourceMappingURL=validate.js.map