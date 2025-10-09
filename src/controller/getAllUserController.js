// Sample users data
const sampleUsers = [
    {
        id: 1,
        name: "MMD3 Admin Test",
        email: "admin@example.com",
        role: "MMD3 Admin",
        createdAt: "2024-01-15T08:30:00Z",
        isActive: true
    },
    {
        id: 2,
        name: "Test User",
        email: "test@example.com",
        role: "Shipping Line",
        createdAt: "2024-02-10T14:22:00Z",
        isActive: true
    },
    {
        id: 3,
        name: "Test Freight Forwarder",
        email: "mike.johnson@example.com",
        role: "Freight Forwarder/CHA  Agent",
        createdAt: "2024-03-05T10:15:00Z",
        isActive: false
    },
    {
        id: 4,
        name: "Test CFS User",
        email: "sarah.wilson@example.com",
        role: "CFS",
        createdAt: "2024-03-20T16:45:00Z",
        isActive: true
    },

];


const getAllUsersArray = async () => {
    return new Promise((resolve) => {
        resolve(sampleUsers);
    });
};

// Controller function to get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await getAllUsersArray();
        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving users",
            error: error.message
        });
    }
};

