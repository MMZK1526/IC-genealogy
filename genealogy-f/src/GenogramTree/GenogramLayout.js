import * as go from "gojs";

export class GenogramLayout extends go.LayeredDigraphLayout {
    constructor() {
        super();
        this.initializeOption = go.LayeredDigraphLayout.InitDepthFirstIn;
        this.spouseSpacing = 10;  // minimum space between spouses
    }

    makeNetwork(coll) {
        // generate LayoutEdges for each parent-child Link
        const net = this.createNetwork();
        if (coll instanceof go.Diagram) {
            this.add(net, coll.nodes, true);
            this.add(net, coll.links, true);
        } else if (coll instanceof go.Group) {
            this.add(net, coll.memberParts, false);
        } else if (coll.iterator) {
            this.add(net, coll.iterator, false);
        }
        return net;
    }

    // internal method for creating LayeredDigraphNetwork where husband/wife pairs are represented
    // by a single LayeredDigraphVertex corresponding to the label Node on the marriage Link
    add(net, coll, nonmemberonly) {
        const horiz = this.direction === 0.0 || this.direction === 180.0;
        const multiSpousePeople = new go.Set();
        const couples = new go.Set();
        // consider all Nodes in the given collection
        const it = coll.iterator;
        while (it.next()) {
            const node = it.value;
            if (!(node instanceof go.Node)) continue;
            if (!node.isLayoutPositioned || !node.isVisible()) continue;
            if (nonmemberonly && node.containingGroup !== null) continue;
            if (node.isLinkLabel) {
                // get Haschild Link
                const link = node.labeledLink;
                const spouseA = link.fromNode;
                const spouseB = link.toNode;
                const vertex = net.addNode(node);
                // now define the vertex size to be big enough to hold both spouses
                if (horiz) {
                    vertex.height = spouseA.actualBounds.height + this.spouseSpacing + spouseB.actualBounds.height;
                    vertex.width = Math.max(spouseA.actualBounds.width, spouseB.actualBounds.width);
                    vertex.focus = new go.Point(vertex.width / 2, spouseA.actualBounds.height + this.spouseSpacing / 2);
                } else {
                    vertex.width = spouseA.actualBounds.width + this.spouseSpacing + spouseB.actualBounds.width;
                    vertex.height = Math.max(spouseA.actualBounds.height, spouseB.actualBounds.height);
                    vertex.focus = new go.Point(spouseA.actualBounds.width + this.spouseSpacing / 2, vertex.height / 2);
                }
            } else {
                // don't add a vertex for any married person!
                // instead, code above adds label node for marriage link
                // assume a marriage Link has a label Node
                let marriages = 0;
                node.linksConnected.each(l => {
                    if (l.isLabeledLink) marriages++;
                });
                if (marriages === 0) {
                    net.addNode(node);
                } else if (marriages > 1) {
                    multiSpousePeople.add(node);
                }
            }
        }

        // now do all Links
        it.reset();
        while (it.next()) {
            const link = it.value;
            if (!(link instanceof go.Link)) continue;
            if (!link.isLayoutPositioned || !link.isVisible()) continue;
            if (nonmemberonly && link.containingGroup !== null) continue;
            // if it'gender a parent-child link, add a LayoutEdge for it
            if (!link.isLabeledLink) {
                const parent = net.findVertex(link.fromNode);  // should be a label node
                const child = net.findVertex(link.toNode);
                if (child !== null) {  // an unmarried child
                    net.linkVertexes(parent, child, link);
                } else {  // a married child
                    link.toNode.linksConnected.each(l => {
                        if (!l.isLabeledLink) return;  // if it has no label node, it'gender a parent-child link
                        // found the Marriage Link, now get its label Node
                        const mlab = l.labelNodes.first();
                        // parent-child link should connect with the label node,
                        // so the LayoutEdge should connect with the LayoutVertex representing the label node
                        const mlabvert = net.findVertex(mlab);
                        if (mlabvert !== null) {
                            net.linkVertexes(parent, mlabvert, link);
                        }
                    });
                }
            }
        }

        while (multiSpousePeople.count > 0) {
            // find all collections of people that are indirectly married to each other
            const node = multiSpousePeople.first();
            const cohort = new go.Set();
            this.extendCohort(cohort, node);
            // then encourage them all to be the same generation by connecting them all with a common vertex
            const dummyvert = net.createVertex();
            net.addVertex(dummyvert);
            const marriages = new go.Set();
            cohort.each(name => {
                name.linksConnected.each(l => {
                    marriages.add(l);
                })
            });
            marriages.each(link => {
                // find the vertex for the marriage link (i.e. for the label node)
                const mlab = link.labelNodes.first()
                const v = net.findVertex(mlab);
                if (v !== null) {
                    net.linkVertexes(dummyvert, v, null);
                }
            });
            // done with these people, now see if there are any other multiple-married people
            multiSpousePeople.removeAll(cohort);
        }
    }

    // collect all of the people indirectly married with a person
    extendCohort(coll, node) {
        if (coll.has(node)) return;
        coll.add(node);
        node.linksConnected.each(l => {
            if (l.isLabeledLink) {  // if it'gender a marriage link, continue with both spouses
                this.extendCohort(coll, l.fromNode);
                this.extendCohort(coll, l.toNode);
            }
        });
    }

    assignLayers() {
        super.assignLayers();
        const horiz = this.direction === 0.0 || this.direction === 180.0;
        // for every vertex, record the maximum vertex width or height for the vertex'gender layer
        const maxsizes = [];
        this.network.vertexes.each(v => {
            const lay = v.layer;
            let max = maxsizes[lay];
            if (max === undefined) max = 0;
            const sz = (horiz ? v.width : v.height);
            if (sz > max) maxsizes[lay] = sz;
        });
        // now make sure every vertex has the maximum width or height according to which layer it is in,
        // and aligned on the left (if horizontal) or the top (if vertical)
        this.network.vertexes.each(v => {
            const lay = v.layer;
            const max = maxsizes[lay];
            if (horiz) {
                v.focus = new go.Point(0, v.height / 2);
                v.width = max;
            } else {
                v.focus = new go.Point(v.width / 2, 0);
                v.height = max;
            }
        });
        // from now on, the LayeredDigraphLayout will think that the Node is bigger than it really is
        // (other than the ones that are the widest or tallest in their respective layer).
    }

    commitLinks() {
        super.commitLinks();
        var splitNode = this.splitNode;
        var mergeNode = this.mergeNode;
        if (splitNode === null || mergeNode === null || this.network === null) return;
        // set default link spots based on this.angle
        var it = this.network.edges.iterator;
        while (it.next()) {
            var e = it.value;
            var link = e.link;
            if (!link) continue;
            if (this.angle === 0) {
                if (this.setsPortSpot) link.fromSpot = go.Spot.Right;
                if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
            } else if (this.angle === 90) {
                if (this.setsPortSpot) link.fromSpot = go.Spot.Bottom;
                if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
            }
        }
        // Make sure links coming into and going out of a Split node come in the correct way
        if (splitNode) {
            // Handle links coming into the Split node
            var cond = this.isConditional(splitNode);
            var swtch = this.isSwitch(splitNode);
            // Handle links going out of the Split node
            var first = true;  // handle "If" nodes specially
            var lit = splitNode.findLinksOutOf();
            while (lit.next()) {
                var link = lit.value;
                if (this.angle === 0) {
                    if (this.setsPortSpot) link.fromSpot = cond ? (first ? go.Spot.Top : go.Spot.Bottom) : (swtch ? go.Spot.RightSide : go.Spot.Right);
                    if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
                } else if (this.angle === 90) {
                    if (this.setsPortSpot) link.fromSpot = cond ? (first ? go.Spot.Left : go.Spot.Right) : (swtch ? go.Spot.BottomSide : go.Spot.Bottom);
                    if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
                }
                first = false;
            }
        }
        if (mergeNode) {
            // Handle links going into the Merge node
            var it = mergeNode.findLinksInto();
            while (it.next()) {
                var link = it.value;
                if (!this.isSplit(link.fromNode)) {  // if link connects Split with Merge directly, only set fromSpot once
                    if (this.angle === 0) {
                        if (this.setsPortSpot) link.fromSpot = go.Spot.Right;
                        if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
                    } else if (this.angle === 90) {
                        if (this.setsPortSpot) link.fromSpot = go.Spot.Bottom;
                        if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
                    }
                }
                if (!link.isOrthogonal) continue;
                // have all of the links coming into the Merge node have segments
                // that share a common X (or if angle==90, Y) coordinate
                link.updateRoute();
                if (link.pointsCount >= 6) {
                    var pts = link.points.copy();
                    var p2 = pts.elt(pts.length - 4);
                    var p3 = pts.elt(pts.length - 3);
                    if (this.angle === 0 && p2.x === p3.x) {
                        var x = mergeNode.position.x - this.layerSpacing / 2;
                        pts.setElt(pts.length - 4, new go.Point(x, p2.y));
                        pts.setElt(pts.length - 3, new go.Point(x, p3.y));
                    } else if (this.angle === 90 && p2.y === p3.y) {
                        var y = mergeNode.position.y - this.layerSpacing / 2;
                        pts.setElt(pts.length - 4, new go.Point(p2.x, y));
                        pts.setElt(pts.length - 3, new go.Point(p3.x, y));
                    }
                    link.points = pts;
                }
            }
            // handle links coming out of the Merge node, looping back left/up
            var it = mergeNode.findLinksOutOf();
            while (it.next()) {
                var link = it.value;
                // if connects internal with external node, it isn't a loop-back link
                if (link.toNode.containingGroup !== mergeNode.containingGroup) continue;
                if (this.angle === 0) {
                    if (this.setsPortSpot) link.fromSpot = go.Spot.TopBottomSides;
                    if (this.setsChildPortSpot) link.toSpot = go.Spot.TopBottomSides;
                } else if (this.angle === 90) {
                    if (this.setsPortSpot) link.fromSpot = go.Spot.LeftRightSides;
                    if (this.setsChildPortSpot) link.toSpot = go.Spot.LeftRightSides;
                }
                link.routing = go.Link.AvoidsNodes;
            }
        }
    }

    commitNodes() {
        super.commitNodes();
        const horiz = this.direction === 0.0 || this.direction === 180.0;
        // position regular nodes
        this.network.vertexes.each(v => {
            if (v.node !== null && !v.node.isLinkLabel) {
                v.node.moveTo(v.x, v.y);
            }
        });
        // position the spouses of each marriage vertex
        this.network.vertexes.each(v => {
            if (v.node === null) return;
            if (!v.node.isLinkLabel) return;
            const labnode = v.node;
            const lablink = labnode.labeledLink;
            // In case the spouses are not actually moved, we need to have the marriage link
            // position the label node, because LayoutVertex.commit() was called above on these vertexes.
            // Alternatively we could override LayoutVetex.commit to be a no-op for label node vertexes.
            lablink.invalidateRoute();
            let spouseA = lablink.fromNode;
            let spouseB = lablink.toNode;
            if (spouseA.opacity > 0 && spouseB.opacity > 0) {
                // prefer fathers on the left, mothers on the right
                if (spouseA.data.gender === 'female') {  // sex is female
                    const temp = spouseA;
                    spouseA = spouseB;
                    spouseB = temp;
                }
                // see if the parents are on the desired sides, to avoid a link crossing
                const aParentsNode = this.findParentsMarriageLabelNode(spouseA);
                const bParentsNode = this.findParentsMarriageLabelNode(spouseB);
                if (aParentsNode !== null && bParentsNode !== null &&
                    (horiz
                        ? aParentsNode.position.y > bParentsNode.position.y
                        : aParentsNode.position.x > bParentsNode.position.x)) {
                    // swap the spouses
                    const temp = spouseA;
                    spouseA = spouseB;
                    spouseB = temp;
                }
                spouseA.moveTo(v.x, v.y);
                if (horiz) {
                    spouseB.moveTo(v.x, v.y + spouseA.actualBounds.height + this.spouseSpacing);
                } else {
                    spouseB.moveTo(v.x + spouseA.actualBounds.width + this.spouseSpacing, v.y);
                }
            } else if (spouseA.opacity === 0) {
                const pos = horiz
                    ? new go.Point(v.x, v.centerY - spouseB.actualBounds.height / 2)
                    : new go.Point(v.centerX - spouseB.actualBounds.width / 2, v.y);
                spouseB.move(pos);
                if (horiz) pos.y++; else pos.x++;
                spouseA.move(pos);
            } else if (spouseB.opacity === 0) {
                const pos = horiz
                    ? new go.Point(v.x, v.centerY - spouseA.actualBounds.height / 2)
                    : new go.Point(v.centerX - spouseA.actualBounds.width / 2, v.y);
                spouseA.move(pos);
                if (horiz) pos.y++; else pos.x++;
                spouseB.move(pos);
            }
            lablink.ensureBounds();
        });
        // position only-child nodes to be under the marriage label node
        this.network.vertexes.each(v => {
            if (v.node === null || v.node.linksConnected.count > 1) return;
            const mnode = this.findParentsMarriageLabelNode(v.node);
            if (mnode !== null && mnode.linksConnected.count === 1) {  // if only one child
                const mvert = this.network.findVertex(mnode);
                const newbnds = v.node.actualBounds.copy();
                if (horiz) {
                    newbnds.y = mvert.centerY - v.node.actualBounds.height / 2;
                } else {
                    newbnds.x = mvert.centerX - v.node.actualBounds.width / 2;
                }
                // see if there'gender any empty space at the horizontal mid-point in that layer
                const overlaps = this.diagram.findObjectsIn(newbnds, x => x.part, p => p !== v.node, true);
                if (overlaps.count === 0) {
                    v.node.move(newbnds.position);
                }
            }
        });
    }

    findParentsMarriageLabelNode(node) {
        const it = node.findNodesInto();
        while (it.next()) {
            const name = it.value;
            if (name.isLinkLabel) return name;
        }
        return null;
    }
}