import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

type Payload = {
    username: string;
}

export const generateToken = (payload: Payload) => {
    dotenv.config();
    const secret = process.env.JWT_SECRET;

    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

export const verifyToken = (token: string) => {
    dotenv.config();
    const secret = process.env.JWT_SECRET;

    return jwt.verify(token, secret);
}
