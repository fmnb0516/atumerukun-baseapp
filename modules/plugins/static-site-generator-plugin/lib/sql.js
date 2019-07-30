
module.exports = async (appContext, util) => {
    class SQLManager {
        constructor(db) {
            this.db = db;
        };

        selectQuery(sql, parameter) {
            return new Promise((resolve, reject) => {
                this.db.all(sql, parameter, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        };
        
        insertQuery(sql, parameter) {
            return new Promise((resolve, reject) => {
                this.db.run(sql, parameter, function(err){
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            });
        };
        
        deleteQuery(sql, parameter) {
            return new Promise((resolve, reject) => {
                this.db.all(sql, parameter, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({});
                    }
                });
            });
        };
    };

    return (db) => {
        return new SQLManager(db);
    };
};