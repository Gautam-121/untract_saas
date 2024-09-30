module.exports = (sequelize, Sequelize) => {
    const Client = sequelize.define("client", {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4, // Generate UUID automatically
            primaryKey: true,
        },
        email: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: false,
        },
        otp: {
            type: Sequelize.STRING,
        },
        otpExpire: {
            type: Sequelize.DATE,
        }
    });

    // Method to generate JWT token for the Client
    Client.prototype.generateToken = async function () {
        return jwt.sign(
            {
                id: this.id,
                email: this.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE
            }
        );
    };

    // Method to generate OTP and set its expiration time
    Client.prototype.getOtp = function () {
        const chars = '0123456789'; // Define the possible characters for the OTP
        const len = 6; // Define the length of the OTP
        let otp = '';
        
        // Generate the OTP
        for (let i = 0; i < len; i++) {
            otp += chars[Math.floor(Math.random() * chars.length)];
        }

        this.otp = otp;
        this.otpExpire = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        return otp;
    };

    return Client;
};
