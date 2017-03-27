const d3 = require('d3');
const config = require('../script/Config');
const util = require('../script/Utility');

// The largest node for each cluster.
var people = [0, 0, 0],
    params = [config.parameters.alpha, config.parameters.beta, config.parameters.gamma],
    clusters = new Array(config.clusterNumber),
    dataPoints = createSusceptedDataPoints(config.totalNumber)

var force = d3.layout.force()
    .nodes(dataPoints)
    .size([config.width, config.height])
    .gravity(.02)
    .charge(-10)
    .on("tick", tick)

function createDataPoints(n) {
    return d3.range(n).map(() => {
        let i = Math.floor(Math.random() * config.clusterNumber),
            r = config.maxRadius,
            node = { cluster: i, radius: r };
        if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = node;
        people[i]++;
        return node;
    });
}

function createSusceptedDataPoints(n) {
    let array = d3.range(n).map((i) => {
        let node = {
            'name': i,
            'cluster': 0,
            'radius': config.maxRadius
        };
        return node;
    })
    clusters[0] = array[0];
    people = [n, 0, 0];
    return array;
}

function tick(e) {
    d3.select("svg").selectAll("circle")
        .each(cluster(10 * e.alpha * e.alpha))
        .each(collide(.5))
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    d3.select("svg").selectAll("line")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });
}

// Move d to be adjacent to the cluster node.
function cluster(alpha) {
    return function (d) {
        var cluster = clusters[d.cluster];
        if (!cluster) return;
        if (cluster == d) return;
        console.log(d);
        console.log(cluster)
        var x = d.x - cluster.x,
            y = d.y - cluster.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + cluster.radius;
        console.log('x,y,l,r' + x + ',' + y + ',' + l + ',' + r)
        if (l != r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            cluster.x += x;
            cluster.y += y;
        }
    };
}

// Resolves collisions between d and all other circles.
function collide(alpha) {
    var quadtree = d3.geom.quadtree(dataPoints);
    return function (d) {
        var r = d.radius + config.maxRadius +
            Math.max(config.padding, config.clusterPadding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit((quad, x1, y1, x2, y2) => {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius +
                        (d.cluster === quad.point.cluster ?
                            config.padding : config.clusterPadding);
                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

function redrawCircle(circle) {
    circle.style(
        'fill', d => color(d.cluster)
    )
}

function updateDataPoints(toType, rate) {
    let previousType = util.previousType(toType),
        nextType = util.nextType(toType),
        changed = 0,
        total = Math.floor(people[previousType] * rate),
        index = Math.floor(Math.random() * config.totalNumber),
        largestCluster = clusters[previousType]
    while (changed < total) {
        if (people[previousType] <= 0) break;
        if (index >= config.totalNumber) index = 0;
        let thisNode = dataPoints[index++];
        if (thisNode.cluster != previousType || thisNode === largestCluster) continue;
        thisNode.cluster = toType;
        if (!clusters[toType]) clusters[toType] = thisNode;
        people[previousType]--;
        people[toType]++;
        changed++;
    }
    return dataPoints;
}

function resetDataPoints() {
    clusters = new Array(config.clusterNumber)
    dataPoints.forEach(function (node) {
        node.cluster = 0;
        node.radius = config.maxRadius
    })
    clusters = dataPoints[0]
    people[0] = dataPoints.length
    people[1] = 0
    people[2] = 0
}

module.exports = {
    clusters: clusters,
    dataPoints: dataPoints,
    people: people,
    forceLayout: force,
    updateDataPoints: updateDataPoints,
    updateCircle: redrawCircle,
    resetDataPoints: resetDataPoints
};
