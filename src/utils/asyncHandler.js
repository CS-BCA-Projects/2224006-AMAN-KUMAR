const asyncHandler = (requestHandler) => {
    return (req, res, next) => {  // Add `return` here
        Promise.resolve(
            requestHandler(req, res, next)
        ).catch((err) => next(err));
    };
};

export { asyncHandler };
