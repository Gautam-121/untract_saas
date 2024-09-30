module.exports = (sequelize, Sequelize) => {
    const Campaign = sequelize.define('campaign', {
        video_id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
            primaryKey: true
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        videoFileUrl: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true
        },
        videoData: {
            type: Sequelize.JSON,
            allowNull: false,
        },
        videoSelectedFile: {
            type: Sequelize.JSONB,
            allowNull: false
        },
        videoLength: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        isShared: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        isDeleted: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    });

    return Campaign;
};
