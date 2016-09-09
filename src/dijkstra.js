import mapData from './mapData'

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
            if(relations[i]!=null && relations[i]>=0) {
                var relation = relations[i];
                var targetStationData = this_.getStationData(i);
                var path = mapData.paths[relation];
                var distance = lastDefiniteStationData.distance + path.data.length;
                if(!targetStationData.definite && distance < targetStationData.distance) {
                    targetStationData.distance = distance;
                    targetStationData.lastStation = this_.lastDefiniteStationId;
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
    var destData = this.getStationData(this.dest);
    if(!destData.definite) {
        return [];
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
            var path = mapData.paths[relation];

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

            paths.push(relation);

            lastStationId = nextStationId;
        }
        if(prevRData) {
            prevRData.paths = paths;
        }
        r.reverse();
        return {
            instructions: r,
            distance: destData.distance
        };
    }
}

