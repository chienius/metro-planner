import mapData from './mapdata1'

function Dijkstra(origin, dest) {
    this.origin = origin;
    this.dest = dest;
    this.pathTable = [];
    this.lastDefiniteStationId = origin;

    for(var stationId in mapData.stations) {
        if(mapData.stations[stationId]) {
            var pathTableData = {
                stationId,
                distance: Infinity,
                definite: false,
                lastStation: null
            };
            if(stationId == origin) {
                pathTableData.distance = 0;
                pathTableData.definite = true;
            }
            this.pathTable.push(pathTableData);
        }
    }
}

module.exports = Dijkstra;

Dijkstra.prototype.getStationData = function (stationId) {
    return this.pathTable.find((x)=>x.stationId == stationId);
}

Dijkstra.prototype.findRoute = function(callback){
    var this_ = this;
    function updatePathTable() {
        var relations = mapData.relations[this_.lastDefiniteStationId];
        var lastDefiniteStationData = this_.getStationData(this_.lastDefiniteStationId);
        for(var i in relations) {
            if(relations[i]!=null && relations[i] instanceof Array) {
                var relation = relations[i];
                for(var path_id of relation) {
                    var targetStationData = this_.getStationData(i);
                    var path = mapData.paths[path_id];
                    var distance = lastDefiniteStationData.distance + path.data.length;
                    if(!targetStationData.definite && distance < targetStationData.distance) {
                        targetStationData.distance = distance;
                        targetStationData.lastStation = this_.lastDefiniteStationId;
                    }
                }
            }
        }
        findDefiniteStation()
    }

    function findDefiniteStation() {
        var newDefiniteStationId = -1;
        var newDefiniteStationDistance = Infinity;
        for(var stationData of this_.pathTable) {
            if(!stationData.definite) {
                if(stationData.distance < newDefiniteStationDistance) {
                    newDefiniteStationId = stationData.stationId;
                    newDefiniteStationDistance = stationData.distance;
                }
            }
        }

        if(newDefiniteStationId >= 0) {
            this_.lastDefiniteStationId = newDefiniteStationId;
            var lastDefiniteStationData = this_.getStationData(this_.lastDefiniteStationId);
            lastDefiniteStationData.definite = true;
            if(this_.lastDefiniteStationId == this_.dest) {
                callback(this_.pathTable);
            } else {
                updatePathTable();
            }
        } else {
            callback(this_.pathTable);
        }
    }

    updatePathTable();
}

Dijkstra.prototype.generateResult = function() {
    console.log(this);
    var destData = this.getStationData(this.dest);
    if(!destData.definite) {
        return {
            instructions: [],
            distance: 0,
            origin: this.origin,
            dest: this.dest
        };
    } else {
        var r = [];
        var lastLine = null;
        var lastStationId = this.dest;
        var paths = new Array();
        var prevRData = null;
        while(true) {
            if(lastStationId == this.origin) break;

            var lastStationData = this.getStationData(lastStationId);
            var nextStationId = lastStationData.lastStation;
            var relation = mapData.relations[lastStationId][nextStationId];
            var path = null;
            var d_path_id = null;
            var pl = Infinity;

            for(var path_id of relation) {
                var path_t = mapData.paths[path_id];
                if(path_t.data.length < pl) {
                    pl = path_t.data.length;
                    path = path_t;
                    d_path_id = path_id;
                } else if(path_t.data.length == pl) {
                    if(path_t.line_name == lastLine) {
                        path = path_t;
                        d_path_id = path_id;
                    }
                }
            }

            if(path.line_name != lastLine) {
                var rdata = {
                    endStationId: lastStationId,
                    lineName: path.line_name,
                    color: path.color,
                    paths: null
                };
                lastLine = path.line_name;
                if(prevRData) {
                    prevRData.paths = paths;
                }
                prevRData = rdata;
                r.push(rdata);
                paths = new Array();
            }

            paths.push(d_path_id);

            lastStationId = nextStationId;
        }
        if(prevRData) {
            prevRData.paths = paths;
        }
        r.reverse();
        return {
            instructions: r,
            distance: destData.distance,
            origin: this.origin,
            dest: this.dest
        };
    }
}

