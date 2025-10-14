const role = [
    "MMD3 Admin",
    "Shipping Line",
    "Freight Forwarder/CHA  Agent",
    "CFS"
];

export const getRole = (req, res) => {
    try {
        return res.status(200).send({
            success: true,
            roles: role
        });
    } catch (error) {
        console.log("Error in getUserTypes:", error);
        return res.status(500).send({ errorMessage: error });
    }
}
