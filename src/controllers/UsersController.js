/**
 * index - GET para listar vários registros
 * show - HET exibit registro especifico
 * create - POST para criar registro
 * update - PUT para atualizar o registro
 * delete - DELETE para remover registro
 */

const { hash, compare } = require('bcryptjs')
const AppError = require('../utils/AppError')
const sqliteConnection = require('../database/sqlite')

class UsersController {
    async create(request, response) {
        const { name, email, password }  = request.body;

        //conexão com o DB
        const database = await sqliteConnection();
        const checkUserExists = await database.get('SELECT * FROM users WHERE email = (?)', [email])

        if (checkUserExists) {
            throw new AppError('Esse e-mail já está em uso.');
        }

        const hashedPassword = await hash(password, 8);

        await database.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]
        );

        return response.status(201).json();
    }

    async update(request, response) {
        const { name, email, password, old_password } = request.body;
        const { id } = request.params;
        
        //conexão com o DB
        const database = await sqliteConnection();
        //para selecionar a linha onde o id for o que estamos buscando 
        const user = await database.get("SELECT * FROM users WHERE id = (?)", [id]);

        if(!user) {
            throw new AppError("User not found!");
        }

        const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        //se o id do email for diferente do id do usuario, entao significa que o email ja esta em uso
        if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
            throw new AppError("This email is is not available.");
        }

        //se o email estiver disponivel, entao:
        //nome do usuario seá = novo nome
        user.name = name 
        //email do usuario seá = novo email
        user.email = email

        if(password && !old_password) {
            throw new AppError("Please, enter the current password to set a new one")
        }


        //preciso importar o "compare" para conseguirmos comparar as senhas criptografadas
        if(password && old_password) {
            const checkOldPassword = await compare(old_password, user.password);

            if(!checkOldPassword){
                throw new AppError("The entered password is not correct")
            }

            user.password = await hash(password, 8);
        }

        await database.run(`
            UPDATE users SET
            name = ?,
            email = ?,
            password = ?,
            updated_at = DATETIME('now')
            WHERE id = ?`,
            [user.name, user.email, user.password, id]
        )

        return response.json();
    }
}

module.exports = UsersController;