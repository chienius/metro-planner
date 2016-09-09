<template lang="pug">
    div.left-bar
        div.form-group.drawing-tools
            h2 绘制工具
            div(v-if="procedure.stage == 0")
                p 无可用选项
            div(v-if="procedure.stage == 1")
                h3 新站点
                p 在下方输入站点名称后，在地图中选择一个点作为站点
                input(type="text", v-model="procedure.stationName", placeholder="站点名称")
            div(v-if="procedure.stage == 2")
                h3 绘制路径
                p 请在下方选择一条线路，然后在地图中绘制连接到当前站点的路径
                div.line-select-group
                    span.color-indicator(v-bind:style="{color: lineData[procedure.lineId].color}")
                    select.line-select(v-model="procedure.lineId")
                        option(v-for="(id, line) in lineData", v-bind:value="id") {{line['name']}}
                    div.clear-fix
        div.form-group.station-tools
            h2 站点操作
            div(v-if="procedure.stage == 0").stage-0
                p 请在图中选择一个站点进行操作，或者新建站点
                a.btn(href="javascript:void(0)", @click="vmAddStation") 新建站点
            div(v-if="procedure.stage == 1").stage-1
                p 请在绘制工具中新建站点
                a.btn(href="javascript:void(0)", @click="vmCancelProcedure") 取消新建
            div(v-if="procedure.stage == 2").stage-2
                p 当前选择站点: <b>{{procedure.stationName}}</b>
                a.btn(href="javascript:void(0)", @click="vmCancelProcedure") 取消选择
                a.btn(href="javascript:void(0)", @click="vmSelectAsOrigin") 作为导航起点
                a.btn(href="javascript:void(0)", @click="vmSelectAsDest") 作为导航终点
                a.btn(href="javascript:void(0)", @click="vmRemoveStation") 删除站点
                div
                    h3 到当前站点的路径
                    div.line-path(v-for="(dest_id, path_id) in data.relations[procedure.curStation]"
                        track-by="$index" v-if="path_id != null && path_id>=0"
                        v-on:mouseover="vmHighlightPath(path_id)"
                        v-on:mouseout="vmHighlightPath()")
                        span.color-indicator(v-bind:style="{color: data.paths[path_id].color}")
                        | {{data.paths[path_id].line_name}}
                        | 到 
                        a(href="javascript:void(0)" v-on:click="vmSelectStation(dest_id)") {{data.stations[dest_id].name}}
                        |  长度{{data.paths[path_id].data.length}}
    div.canvas-group
        canvas.design-canvas#design-canvas-1
        canvas.design-canvas#design-canvas-2
        canvas.design-canvas#design-canvas-3
        canvas.design-canvas#design-canvas-4
        canvas.design-canvas#design-canvas-5
        .clear-fix
    div.right-bar
        div.form-group.navi-tools
            h2 导航
            p 请选择起点与终点
            label(for="navi-form-origin") <b>起点</b>
            input#navi-form-origin(type=text v-bind:value="data.stations[naviForm.origin].name" v-on:focus="vmSelectStation(naviForm.origin)" readonly)
            br
            label(for="navi-form-dest") <b>终点</b>
            input#navi-form-dest(type=text v-bind:value="data.stations[naviForm.dest].name" v-on:focus="vmSelectStation(naviForm.dest)" readonly)
            br
            a.btn(href="javascript:void(0)" @click="vmStartNavi") 开始导航
</template>

<script>
import $ from 'jquery'
import mapData from '../mapData'
import Dijkstra from '../dijkstra'

module.exports={
    data () {
        return {
            ctx: null,
            width: 40,
            height: 40,
            blocksize: 15,
            mousePressed: false,
            prevHoverBlock: [],
            procedure: {
                'stage': 0, // 0 - No operation, 1 - Set station, 2 - Draw path
                'stationName': '',
                'curStation': -1,
                'lineId': 0,
                'path': []
            },
            data: mapData,
            //data: {
                //'stations': [],
                //'paths': [], // {color: <colorCode>, line_name: '1号线', data: [<pid>]}
                //'relations': [] // {path: <path>}
            //},
            lineData: [
                {name: '1号线', color: '#E4002B'},
                {name: '2号线', color: '#97D700'},
                {name: '3号线', color: '#FFD100'},
                {name: '4号线', color: '#5F259F'},
                {name: '5号线', color: '#AC4FC6'},
                {name: '6号线', color: '#D71671'},
                {name: '7号线', color: '#FF6900'},
                {name: '8号线', color: '#009EDB'},
                {name: '9号线', color: '#71C5E8'},
                {name: '10号线', color: '#C1A7E2'},
                {name: '11号线', color: '#76232F'},
                {name: '12号线', color: '#007A5E'},
                {name: '13号线', color: '#EF95CF'},
                {name: '16号线', color: '#2CD5C4'},
                {name: '磁浮线', color: '#888888'}
            ],
            naviForm: {
                origin: '',
                dest: ''
            }
        }
    },
    ready() {
        this.ctx1 = document.getElementById('design-canvas-1').getContext('2d');
        this.ctx2 = document.getElementById('design-canvas-2').getContext('2d');
        this.ctx3 = document.getElementById('design-canvas-3').getContext('2d');
        this.ctx4 = document.getElementById('design-canvas-4').getContext('2d');
        this.ctx5 = document.getElementById('design-canvas-5').getContext('2d');
        this.initCanvas(this.ctx1);
        this.initCanvas(this.ctx2);
        this.initCanvas(this.ctx3);
        this.initCanvas(this.ctx4);
        this.initCanvas(this.ctx5);
        this.initCanvasGroup();
        this.drawCoordinates(this.ctx1);
        this.bindMouse();
        this.resetPaths();
        this.resetStations();
    },
    methods: {
        bindMouse() {
            var vm = this;
            $('.canvas-group')
                .mousedown((e)=>{
                    vm.mousePressed = true;
                    if(vm.procedure.stage == 2) {
                        // set start point
                        var pid = vm.getBlockCoor(e);
                        pid = vm.coor2Id(pid[0], pid[1])
                        vm.procedure.path = [];
                        vm.addPointToProcPath(pid);
                    }
                })
                .mousemove((e)=>{
                    if(vm.mousePressed) {
                        if(vm.procedure.stage == 2) {
                            // draw path
                            var pid = vm.getBlockCoor(e);
                            pid = vm.coor2Id(pid[0], pid[1])
                            vm.addPointToProcPath(pid);
                        }
                    } else {
                        var coor = vm.getBlockCoor(e);
                        vm.setHoverBlock(vm.ctx1, coor[0], coor[1]);
                    }
                })
                .mouseup((e)=>{
                    if(vm.mousePressed) {
                        if(vm.procedure.stage == 2) {
                            // set end point
                            var pid = vm.getBlockCoor(e);
                            pid = vm.coor2Id(pid[0], pid[1])
                            vm.addPointToProcPath(pid);
                            vm.checkProcPath();
                        }
                    }
                    vm.mousePressed = false;
                })
                .mouseleave((e)=>{
                    if(vm.mousePressed) {
                        if(vm.procedure.stage == 2) {
                            // set end point
                            var pid = vm.getBlockCoor(e);
                            pid = vm.coor2Id(pid[0], pid[1])
                            vm.addPointToProcPath(pid);
                            vm.checkProcPath();
                        }
                    }
                    vm.mousePressed = false;
                })
                .click((e)=>{
                    var coor = vm.getBlockCoor(e);
                    var pid = vm.coor2Id(coor[0], coor[1]);
                    if(vm.procedure.stage == 1) {
                        if(vm.addStation(pid, vm.procedure.stationName)) {
                            vm.procedure.curStation = pid;
                            vm.procedure.stage = 2;
                            this.clearCanvas(this.ctx4);
                            this.drawPoint(this.ctx4, coor[0], coor[1], '#888', this.blocksize);
                        }
                    }else if(vm.procedure.stage == 0){
                        vm.vmSelectStation(pid);
                    }
                })
                .dblclick((e)=>{
                    e.preventDefault();
                    if (window.getSelection)
                        window.getSelection().removeAllRanges();
                    else if (document.selection)
                        document.selection.empty();

                    var coor = vm.getBlockCoor(e);
                    var pid = vm.coor2Id(coor[0], coor[1]);
                    vm.vmSelectStation(pid);
                });
        },
        vmAddStation() {
            var vm = this;
            vm.procedure.stage = 1;
            vm.procedure.stationName = '';
            vm.procedure.curStation = -1;
        },
        vmCancelProcedure() {
            var vm = this;
            vm.procedure.stage = 0;
            vm.procedure.stationName = '';
            vm.procedure.curStation = -1;
            this.clearCanvas(this.ctx4);
        },
        vmRemoveStation() {
            var vm = this;
            delete vm.data.stations[vm.procedure.curStation];
            vm.data.relations[vm.procedure.curStation].forEach(function(p, i){
                if(p!=null && p>=0) {vm.data.paths[p]=undefined; delete vm.data.relations[i][vm.procedure.curStation]}
            });
            delete vm.data.relations[vm.procedure.curStation];
            vm.resetPaths();
            vm.resetStations();
            vm.vmCancelProcedure();
        },
        vmHighlightPath(pid = -1) {
            var vm = this;
            if(pid>=0) {
                var path = vm.data.paths[pid]
                vm.clearCanvas(vm.ctx5);
                vm.drawPathLine(vm.ctx5, path.data, '#000');
            } else {
                vm.clearCanvas(vm.ctx5);
            }
        },
        vmSelectAsOrigin() {
            var vm = this;
            var station = vm.data.stations[vm.procedure.curStation];
            if(vm.procedure.curStation == vm.naviForm.dest) {
                alert('起点终点不可选择相同站点');
            } else if(station) {
                vm.naviForm.origin = vm.procedure.curStation;
            }
        },
        vmSelectAsDest() {
            var vm = this;
            var station = vm.data.stations[vm.procedure.curStation];
            if(vm.procedure.curStation == vm.naviForm.origin) {
                alert('起点终点不可选择相同站点');
            } else if(station ) {
                vm.naviForm.dest = vm.procedure.curStation;
            }
        },
        vmSelectStation(pid) {
            var coor = this.id2Coor(pid);
            if(this.data.stations[pid]) {
                this.procedure.curStation = pid;
                this.procedure.stationName = this.data.stations[pid].name;
                this.procedure.stage = 2;
                this.clearCanvas(this.ctx4);
                this.drawPoint(this.ctx4, coor[0], coor[1], '#888', this.blocksize);
            }
        },
        vmStartNavi() {
            var djk = new Dijkstra(this.naviForm.origin, this.naviForm.dest);
            console.log(djk);
            djk.findRoute((pathTable)=>{
                console.log(djk.generateResult());
            });
        },
        addStation(pid, name) {
            var vm =this;
            var coor = vm.id2Coor(pid);
            if(!vm.data.stations[pid] && name) {
                vm.drawPoint(vm.ctx3, coor[0], coor[1], '#000');
                vm.data.stations[pid] = {name};
                vm.data.relations[pid] = new Array();
                return true;
            }
            return false;
        },
        addPointToProcPath(pid) {
            var vm = this;
            var coor = vm.id2Coor(pid);
            var color = vm.lineData[vm.procedure.lineId]['color'];
            var last_pid = vm.procedure.path[vm.procedure.path.length - 1];
            var last_coor = vm.id2Coor(last_pid);
            if(pid!=last_pid) {
                if(vm.procedure.path.length<1 || vm.checkCoorsAreNeighbor(coor, last_coor)) {
                    vm.procedure.path.push(pid);
                    vm.drawBlock(vm.ctx2, coor[0], coor[1], color);
                } else {
                    // Invalid
                    vm.drawPath(vm.ctx2, vm.procedure.path);
                    vm.mousePressed = false;
                }
            }
        },
        checkCoorsAreNeighbor(coor1, coor2) {
            if( Math.abs(coor1[0] - coor2[0]) <= 1 && Math.abs(coor1[1] - coor2[1]) <= 1 ) {
                return true;
            } else {
                return false;
            }
        },
        checkProcPath(){
            var vm = this;
            var first_pid = vm.procedure.path[0];
            var last_pid = vm.procedure.path[vm.procedure.path.length - 1];
            var result = false;
            if(first_pid == last_pid) {
                result = false;
            } else {
                if(vm.procedure.curStation == first_pid) {
                    if(vm.data.stations[last_pid]){
                        result=true;
                    } else {
                        result=false;
                    }
                } else if(vm.procedure.curStation == last_pid) {
                    if(vm.data.stations[first_pid]){
                        result=true;
                    } else {
                        result=false;
                    }
                } else {
                    result=false
                }
            }

            if(result) {
                var line = vm.lineData[vm.procedure.lineId];
                var data = {
                    color: line['color'],
                    line_name: line['name'],
                    data: vm.procedure.path
                };
                if(vm.data.relations[first_pid][last_pid]!= null && vm.data.relations[last_pid][first_pid]!=null && (vm.data.relations[first_pid][last_pid]>=0 || vm.data.relations[last_pid][first_pid]>=0)) {
                    vm.resetPaths();
                } else {
                    vm.data.paths.push(data);
                    var last_path_id = vm.data.paths.length-1;
                    vm.data.relations[first_pid][last_pid] = last_path_id;
                    vm.data.relations[last_pid][first_pid] = last_path_id;
                    var a = vm.data.relations[first_pid].slice();
                    var b = vm.data.relations[last_pid].slice();
                    vm.data.relations.$set(first_pid, a);
                    vm.data.relations.$set(last_pid, b);
                    vm.resetPaths();
                }
            } else {
                vm.resetPaths();
            }
        },
        //checkProcPath(){
            //var vm = this;
            //var first_pid = vm.procedure.path[0];
            //var last_pid = vm.procedure.path[vm.procedure.path.length - 1];
            //var result = false;
            //if(first_pid == last_pid) {
                //result = false;
            //} else {
                //if(vm.procedure.curStation == first_pid) {
                    //if(vm.data.stations[last_pid]){
                        //result=true;
                    //} else {
                        //result=false;
                    //}
                //} else if(vm.procedure.curStation == last_pid) {
                    //if(vm.data.stations[first_pid]){
                        //result=true;
                    //} else {
                        //result=false;
                    //}
                //} else {
                    //result=false
                //}
            //}

            //if(result) {
                //var line = vm.lineData[vm.procedure.lineId];
                //var data = {
                    //color: line['color'],
                    //line_name: line['name'],
                    //data: vm.procedure.path
                //};
                //if(vm.data.relations[first_pid][last_pid]>=0 || vm.data.relations[last_pid][first_pid]>=0) {
                    //vm.resetPaths();
                //} else {
                    //vm.data.paths.push(data);
                    //var last_path_id = vm.data.paths.length-1;
                    //vm.data.relations[first_pid][last_pid] = last_path_id;
                    //vm.data.relations[last_pid][first_pid] = last_path_id;
                    //vm.resetPaths();
                //}
            //} else {
                //vm.resetPaths();
            //}
        //},
        setColor(){
            this.lineColor = this.lineColorInput;
        },
        initCanvas(ctx) {
            ctx.canvas.style.width = this.width*this.blocksize+"px";
            ctx.canvas.style.height = this.height*this.blocksize+"px";
            ctx.canvas.width = this.width*this.blocksize;
            ctx.canvas.height = this.height*this.blocksize;
        },
        initCanvasGroup() {
            $('.canvas-group').width(this.width*this.blocksize+1);
            $('.canvas-group').height(this.height*this.blocksize+1);
        },
        drawCoordinates(ctx){
            ctx.strokeStyle="#aaa";
            ctx.lineWidth=1;
            for(var x=0; x < this.width+1; x++) {
                var x_ = x*this.blocksize;
                ctx.beginPath();
                ctx.moveTo(x_, 0);
                ctx.lineTo(x_, ctx.canvas.height);
                ctx.stroke();
            }
            for(var y=0; y < this.height+1; y++) {
                var y_ = y*this.blocksize;
                ctx.beginPath();
                ctx.moveTo(0, y_);
                ctx.lineTo(ctx.canvas.width, y_);
                ctx.stroke();
            }
        },
        resetPaths() {
            var vm = this;
            vm.clearCanvas(vm.ctx2);
            vm.data.paths.forEach(function(path){
                if(path)
                    vm.drawPath(vm.ctx2, path.data, path.color);
            });
        },
        resetStations() {
            var vm = this;
            vm.clearCanvas(vm.ctx3);
            vm.data.stations.forEach((s, i)=>{
                if(s) {
                    var coor = vm.id2Coor(i);
                    vm.drawPoint(vm.ctx3, coor[0], coor[1], '#000');
                }
            });
        },
        drawPathLine(ctx, path, color=false) {
            var vm = this;
            var started = false;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            for(var pid of path) {
                if(pid>=0) {
                    var coor = vm.id2Coor(pid);
                    var x = coor[0]*this.blocksize + this.blocksize/2;
                    var y = coor[1]*this.blocksize + this.blocksize/2;
                    if(!started) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            }
            ctx.stroke();
            ctx.closePath();
        },
        drawPath(ctx, path, color=false) {
            var vm = this;
            path.forEach(function(pid){
                var coor = vm.id2Coor(pid);
                vm.drawBlock(ctx, coor[0], coor[1], color);
            });
        },
        getBlockCoor(e) {
            var offset = $('#design-canvas-1').offset();
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;

            x /= this.blocksize;
            y /= this.blocksize;
            return [Math.floor(x), Math.floor(y)];
        },
        setHoverBlock(ctx, x, y) {
            if(this.prevHoverBlock && (this.prevHoverBlock[0]!=x || this.prevHoverBlock[1]!=y)) {
                // Clear Old Rect
                this.drawBlock(ctx, this.prevHoverBlock[0], this.prevHoverBlock[1]);
            }

            this.drawBlock(ctx, x, y, '#ddd');
            this.prevHoverBlock = [x, y];
        },
        drawBlock(ctx, x, y, color=false) {
            var x_ = x*this.blocksize+1;
            var y_ = y*this.blocksize+1;
            var w = this.blocksize-2;
            var h = this.blocksize-2;
            if(color===false) {
                ctx.clearRect(x_, y_, w, h);
            } else {
                ctx.fillStyle = color;
                ctx.moveTo(x_, y_);
                ctx.fillRect(x_, y_, w, h);
            }
        },
        drawPoint(ctx, x, y, color=false, radius=false) {
            radius = radius ? radius : this.blocksize/2;
            var x_ = x*this.blocksize + this.blocksize/2;
            var y_ = y*this.blocksize + this.blocksize/2;
            if(color == false) {
            } else {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x_, y_, radius, 0, 2*Math.PI);
                ctx.closePath();
                ctx.fill();
            }
        },
        clearCanvas(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        coor2Id(x, y) {
            return x*this.height + y;
        },
        id2Coor(id) {
            var x = Math.floor(id / this.height);
            var y = id % this.height;
            return [x, y];
        },
        dumpMapData() {
            console.log(JSON.stringify(this.data));
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.canvas-group {
    position: relative;
    border: 1px solid #000;
    margin-left: auto;
    margin-right: auto;
    margin-top: 10px;
    padding: 0;
    canvas.design-canvas{
        display: block;
        position: absolute;
        top: 0;
        left: 0;
    }
    .clear-fix {
        clear: both;
    }
}

a.btn {
    display: block;
    border: 1px solid #000;
    text-align: center;
    font-size: 1.2em;
    margin: 10px 20px;
    border-radius: 3px;
    padding: 5px;
    background-color: #fff;
    cursor: pointer;
    color: #000;
    &:focus{
        outline: 5px solid #ddd;
    }
}

input, select {
    border: 1px solid #000;
    background-color: #fff;
    margin: 10px 0;
    &:focus {
        outline: 5px solid #ddd;
    }
}

.form-group {
    background-color: #fff;
    position: relative;
    width: 300px;
    padding: 20px;
    border: 5px solid #000;
    margin: 10px;
    h2 {
        margin: 0;
        -moz-user-select     : none;
        -khtml-user-select   : none;
        -webkit-user-select  : none;
        -o-user-select       : none;
        user-select          : none;
    }
    .color-indicator {
        color: #000;
        font-size: 20px;
        &::after {
            content: '◼︎';
        }
    }
    .line-select-group{
        .line-select {
            display: block;
            float: left;
            height: 30px;
            margin: 0;
        }
        .color-indicator {
            float: left;
        }
    }
    .line-path {
        &:hover {
            background: #eee;
        }
    }
}

.left-bar, .canvas-group, .right-bar {
    float: left;
}

.clear-fix {
    clear: both;
}
</style>
