module.exports = (sequelize , Sequelize)=>{
    const Branding = sequelize.define("branding" , {
        id: {
            type: Sequelize.UUID,
            primaryKey: true, 
            defaultValue: Sequelize.UUIDV4
        },
        brandName:{
            type: Sequelize.STRING,
            allowNull: false,
        },
        description:{
            type: Sequelize.TEXT,
            allowNull: false,
        },
        logo:{
            type: Sequelize.STRING,
            allowNull: false,
        },
        url:Sequelize.STRING,
        coverImage:{
            type: Sequelize.STRING,
            allowNull: false,
        },
    }, {
        hooks: {
            beforeCreate: (appBranding, options) => {
                // Trim leading and trailing spaces for brandName and description
                if (appBranding.brandName) {
                    appBranding.brandName = appBranding.brandName.trim();
                }
                if (appBranding.description) {
                    appBranding.description = appBranding.description.trim();
                }
            },
            beforeUpdate: (appBranding, options) => {
                // Trim leading and trailing spaces for brandName and description
                if (appBranding.brandName) {
                    appBranding.brandName = appBranding.brandName.trim();
                }
                if (appBranding.description) {
                    appBranding.description = appBranding.description.trim();
                }
            }
        }
    })
    return Branding
}







