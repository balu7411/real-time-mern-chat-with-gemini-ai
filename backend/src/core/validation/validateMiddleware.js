/**
 * Express and Socket.IO validation middleware using Zod schemas
 */

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorList = result.error.issues || result.error.errors || [];
      const issues = errorList.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({
        message: issues[0]?.message || "Validation error",
        errors: issues,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

function validateSocketPayload(schema, payload) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    const issues = errorList.map((e) => e.message);
    throw new Error(`Invalid socket payload: ${issues.join("; ")}`);
  }
  return result.data;
}

module.exports = {
  validateBody,
  validateSocketPayload,
};
