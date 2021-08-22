import axios from 'axios'
import { showAlert, hideAlert } from './alerts'
export const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email: email,
                password: password
            }
        });
        console.log(res.data.data.status)
        if (res.data.data.status === 'success') {
            hideAlert()
            showAlert('success', 'logged in successfully')
            window.setTimeout(() => {
                location.assign('/')
            }, 1500)

        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    };
};

export const logout = async () => {
    try {
        const res = await axios({
            method: 'GET',
            url: '/api/v1/users/logout',
        })
        console.log(res.data)
        if (res.data.status === 'success') location.reload(true)

    }
    catch (err) {
        console.log(err)
        showAlert('error', 'Error logging out! Try again.')
    }
}
