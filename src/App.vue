<template lang="pug">
    div.main-frame
        //nav
            //h1.logo
                //ruby
                    //| 地
                    //rt ち
                //ruby
                    //| 下
                    //rt か
                //ruby
                    //| 鉄
                    //rt てつ
                //ruby
                    //| 駅
                    //rt えき
                //ruby
                    //| 計
                    //| 画
                    //| 者
                    //rt プランナ
            //span.spliter
            //h2.action-title 绘制
            //span.copy-info
                //| Copyright &copy; 2016 Archie Lu.
        map-canvas
</template>

<script>
import MapCanvas from './components/MapCanvas'

module.exports = {
    data(){
        return {
            'good': 'a'
        }
    },
    components: {MapCanvas}
}
</script>

<style lang="scss">
    body, html {
        width: 100%;
        height: 100%;
    }

    .main-frame {
        width: 100%;
        height: 100%;
        position: relative;
        nav {
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            padding: 20px 50px;
            height: 150px;
            border-bottom: 1px solid #000;
            background: rgba(255, 255, 255, .7);
            ruby {
                margin-right: 10px;
            }
            h1, h2 {
                float: left;
            }
            .spliter {
                margin: 0 20px;
                border-right: 1px solid #000;
                height: 90px;
                display: block;
                float: left;
            }
            h2.action-title {
                line-height: 90px;
            }
            .copy-info {
                float: right;
                line-height: 150px;
            }
        }
    }
</style>
