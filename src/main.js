import Vue from 'vue'
import App from './App'
import 'sanitize.css/sanitize.css'
import $ from 'jquery'

new Vue({
    el: 'body',
    components: { App },
    ready(){
        this.changeTitle("Metro Planner by Chienius")
    },
    methods: {
        changeTitle(title){
            document.getElementsByTagName('title')[0].innerHTML=title
        }
    }
})
