const bcrypt = require('bcryptjs');
const password = 'Godlovesme16';

bcrypt.hash(password, 10, function(err, hash) {
    if (err) throw err;
    console.log('Hashed password:', hash);
});
