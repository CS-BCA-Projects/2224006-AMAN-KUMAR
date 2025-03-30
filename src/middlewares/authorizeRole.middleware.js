export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).render("errorPage", { message: "Access Denied" });
        }
        next();
    };
};
