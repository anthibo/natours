import axios from 'axios'
import { showAlert } from './alerts'
const stripe = Stripe('pk_test_51JPXu6DFBlj1a7VeSwnxAYXfMghxu2XaTZ1VJGxciMNUxLQVxb29bVZlQdxYk5jmD8HTMciGjop6w6AFKwnciFqk00PSh0lCbH')
export const bookTour = async tourId => {
    try {
        // 1) get checkout session from API 
        const session = await axios(`/api/v1/booking/checkout-session/${tourId}`)
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    }
    catch (error) {
        console.log(error)
        showAlert('error', error)
    }

    //2) create checkout form + charge credit card
}