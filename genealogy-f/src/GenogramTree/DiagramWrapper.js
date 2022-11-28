import React from 'react';
import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';
import { GenogramLayout } from './GenogramLayout';
import { ArcLink } from './ArcLink';
import { Opacity } from './Const';

const $ = go.GraphObject.make;

export class DiagramWrapper extends React.Component {
    constructor(props) {
        super(props);
        this.highlight = props.highlight;
        this.diagramRef = React.createRef();
        this.nodeDataArray = props.nodeDataArray;
        this.root = props.root;
        this.hiddenPeople = props.hiddenPeople;
        this.getFocusPerson = props.getFocusPerson;
        this.personMap = props.personMap;
        this.state = { diagram: undefined, isFirstRender: true };
        this.init();
    }

    componentDidMount() {
        if (!this.diagramRef.current) return;
        const diagram = this.diagramRef.current.getDiagram();
        if (diagram instanceof go.Diagram) {
            diagram.addDiagramListener('ObjectSingleClicked', this.props.onDiagramEvent);
        }
        document.getElementById('svgButton').addEventListener('click', this.makeSvg);
    }

    componentWillUnmount() {
        if (!this.diagramRef.current) return;
        const diagram = this.diagramRef.current.getDiagram();
        if (diagram instanceof go.Diagram) {
            diagram.removeDiagramListener('ObjectSingleClicked', this.props.onDiagramEvent);
        }
    }

    init() {
        const highlight = this.highlight;
        if (!(this.state.diagram === undefined)) {
            this.diagram = this.state.diagram;
            return;
        }
        this.state.diagram = $(go.Diagram,
            {
                // initialAutoScale: go.Diagram.initialAutoScale,
                initialContentAlignment: go.Spot.Center,
                'undoManager.isEnabled': false,
                // when a node is selected, draw a big yellow circle behind it
                nodeSelectionAdornmentTemplate:
                    $(go.Adornment, 'Auto',
                        { layerName: 'Grid' },  // the predefined layer that is behind everything else
                        $(go.Shape, 'Circle', { fill: '#c1cee3', stroke: null }),
                        $(go.Placeholder, { margin: 0 })
                    ),
                scrollMargin: 250,
                layout:  // use a custom layout, defined below
                    $(GenogramLayout, { direction: 90, layerSpacing: 50, columnSpacing: 0 }),
                'InitialLayoutCompleted': _ => {
                    var node = this.diagram.findNodeForKey(this.getFocusPerson());
                    if (node == null) {
                        node = this.diagram.findNodeForKey(this.root);
                    }
                    if (node != null) {
                        this.diagram.commandHandler.scrollToPart(node);
                        this.diagram.select(node);
                    }
                },
                'toolManager.dragSelectingTool': null,
                minScale: 0.1,
                maxScale: 5,
            });

        this.diagram = this.state.diagram;
        // Whenever the Diagram.position or Diagram.scale change,
        // update the position of all simple Parts that have a _viewPosition property.  
        this.diagram.addDiagramListener("ViewportBoundsChanged", function(e) {
                e.diagram.commit(function(dia) {
                // only iterates through simple Parts in the diagram, not Nodes or Links
                    dia.parts.each(function(part) {
                        // and only on those that have the "_viewPosition" property set to a Point
                        console.log(part.position)
                        console.log(dia.transformViewToDoc(part._viewPosition))
                        if (part._viewPosition) {
                            if (dia.transformViewToDoc(part._viewPosition).x > 0) {
                                // part.position is now a Doc cor
                                part.position = new go.Point(dia.transformViewToDoc(part._viewPosition).x, part.position.y)
                            } else {
                                // part.position is now a View coordinate
                                part.position = part._viewPosition
                            }
                            // part.scale = 1/dia.scale;  // counteract any zooming
                        }
                    })
                }, null);  // set skipsUndoManager to true, to avoid recording these changes
            });
        // determine the color for each attribute shape
        function attrFill(a) {
            switch (a) {
                case 'A':
                    return '#00af54'; // green
                case 'B':
                    return '#f27935'; // orange
                case 'C':
                    return '#d4071c'; // red
                case 'D':
                    return '#70bdc2'; // cyan
                case 'E':
                    return '#fcf384'; // gold
                case 'F':
                    return '#e69aaf'; // pink
                case 'G':
                    return '#08488f'; // blue
                case 'H':
                    return '#866310'; // brown
                case 'I':
                    return '#9270c2'; // purple
                case 'J':
                    return '#a3cf62'; // chartreuse
                case 'K':
                    return '#91a4c2'; // lightgray bluish
                case 'L':
                    return '#af70c2'; // magenta
                case 'S':
                    return '#d4071c'; // red
                default:
                    return 'transparent';
            }
        }

        // determine the geometry for each attribute shape in a male;
        // except for the slash these are all squares at each of the four corners of the overall square
        const tlsq = go.Geometry.parse('F M1 1 l19 0 0 19 -19 0z');
        const trsq = go.Geometry.parse('F M20 1 l19 0 0 19 -19 0z');
        const brsq = go.Geometry.parse('F M20 20 l19 0 0 19 -19 0z');
        const blsq = go.Geometry.parse('F M1 20 l19 0 0 19 -19 0z');
        const slash = go.Geometry.parse('F M38 0 L40 0 40 2 2 40 0 40 0 38z');

        function maleGeometry(a) {
            switch (a) {
                case 'A':
                    return tlsq;
                case 'B':
                    return tlsq;
                case 'C':
                    return tlsq;
                case 'D':
                    return trsq;
                case 'E':
                    return trsq;
                case 'F':
                    return trsq;
                case 'G':
                    return brsq;
                case 'H':
                    return brsq;
                case 'I':
                    return brsq;
                case 'J':
                    return blsq;
                case 'K':
                    return blsq;
                case 'L':
                    return blsq;
                case 'S':
                    return slash;
                default:
                    return tlsq;
            }
        }

        // determine the geometry for each attribute shape in a female;
        // except for the slash these are all pie shapes at each of the four quadrants of the overall circle
        const tlarc = go.Geometry.parse('F M20 20 B 180 90 20 20 19 19 z');
        const trarc = go.Geometry.parse('F M20 20 B 270 90 20 20 19 19 z');
        const brarc = go.Geometry.parse('F M20 20 B 0 90 20 20 19 19 z');
        const blarc = go.Geometry.parse('F M20 20 B 90 90 20 20 19 19 z');

        function femaleGeometry(a) {
            switch (a) {
                case 'A':
                    return tlarc;
                case 'B':
                    return tlarc;
                case 'C':
                    return tlarc;
                case 'D':
                    return trarc;
                case 'E':
                    return trarc;
                case 'F':
                    return trarc;
                case 'G':
                    return brarc;
                case 'H':
                    return brarc;
                case 'I':
                    return brarc;
                case 'J':
                    return blarc;
                case 'K':
                    return blarc;
                case 'L':
                    return blarc;
                case 'S':
                    return slash;
                default:
                    return tlarc;
            }
        }

        function mouseEnter(e, obj) {
            if (highlight.length > 0) return;
            var node = obj.findObject('NODE2');
            // var shape = obj.findObject('SHAPE');
            // shape.fill = '#6DAB80';
            // shape.stroke = '#A6E6A1';
            // var text = obj.findObject('TEXT');
            // text.stroke = 'white';
            // highlight all Links and Nodes coming out of a given Node
            var diagram = node.diagram;
            // node.shape.fill = '#7ec2d7'
            diagram.startTransaction('highlight');
            // remove any previous highlighting
            diagram.clearHighlighteds();
            // node.isHighlighted = true;
            // for each Link coming out of the Node, set Link.isHighlighted
            node.isHighlighted = true;
            node.findLinksConnected().each(function (l) {
                l.isHighlighted = true;
                if (l.isLabeledLink) {
                    let it = l.labelNodes;
                    it.first().findLinksConnected().each(function (l) {
                        l.isHighlighted = true;
                        l.toNode.isHighlighted = true;
                    });
                }
            });
            node.findNodesConnected().each(function (n) {
                n.isHighlighted = true;
                let link = n.labeledLink;
                if (link != null) {
                    link.isHighlighted = true;
                    link.fromNode.isHighlighted = true;
                    link.toNode.isHighlighted = true;
                }

            });
            diagram.commitTransaction('highlight');
        }

        function mouseLeave(e, obj) {
            // e.diagram.commit(function (d) {
            //     d.clearHighlighteds();
            // }, 'no highlighteds');
        }


        // two different node templates, one for each sex,
        // named by the category value in the node data object
        this.diagram.nodeTemplateMap.add('male',  // male
            $(go.Node, 'Vertical',
                // TODO can make this non-selectable with selectable: false, but we want clickable but not movable?
                // see this for how to do stuff on click? - https://gojs.net/latest/extensions/Robot.html
                {
                    movable: true,
                    locationSpot: go.Spot.Center,
                    locationObjectName: 'ICON',
                    selectionObjectName: 'ICON',
                    name: 'NODE2',
                    mouseEnter: mouseEnter,
                    mouseLeave: mouseLeave,
                    deletable: false,
                },
                // new go.Binding('opacity', 'hide', h => h ? 0 : 1),
                // new go.Binding('pickable', 'hide', h => !h),
                $(go.Panel,
                    { name: 'ICON' },
                    $(go.Shape, 'Square',
                        {
                            width: 40,
                            height: 40,
                            strokeWidth: 2,
                            fill: '#7ec2d7',
                            stroke: '#919191',
                            portId: '',
                            name: 'SHAPE'
                        },
                        new go.Binding('fill', 'color'),
                        new go.Binding('fill', 'isHighlighted', function (h) {
                            return h ? '#FFD700' : '#7ec2d7';
                        }).ofObject(),
                        new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                            return h ? 2 : 2;
                        }).ofObject(),
                        new go.Binding('opacity', 'opacity')),
                    $(go.Panel,
                        { // for each attribute show a Shape at a particular place in the overall square
                            itemTemplate:
                                $(go.Panel,
                                    $(go.Shape,
                                        { stroke: null, strokeWidth: 0 },
                                        new go.Binding('fill', '', attrFill),
                                        new go.Binding('geometry', '', maleGeometry))
                                ),
                            margin: 1
                        },
                        new go.Binding('itemArray', 'a')
                    )
                ),
                $(go.TextBlock,
                    { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' },
                    new go.Binding('text', 'name'), new go.Binding('opacity', 'opacity'))
            ));
        // remove highlighting form all nodes, when user clicks on background
        this.diagram.click = function (e) {
            highlight.length = 0;
            e.diagram.commit(function (d) { d.clearHighlighteds(); }, 'no highlighteds');
        };
        this.diagram.nodeTemplateMap.add('female',  // female
            $(go.Node, 'Vertical',
                {
                    movable: true,
                    locationSpot: go.Spot.Center,
                    locationObjectName: 'ICON',
                    selectionObjectName: 'ICON',
                    name: 'NODE2',
                    mouseEnter: mouseEnter,
                    mouseLeave: mouseLeave,
                    deletable: false,
                },
                // new go.Binding('opacity', 'hide', h => h ? 0 : 1),
                // new go.Binding('pickable', 'hide', h => !h),
                $(go.Panel,
                    { name: 'ICON' },
                    $(go.Shape, 'Circle',
                        {
                            width: 40,
                            height: 40,
                            strokeWidth: 2,
                            fill: '#ff99a8',
                            stroke: '#a1a1a1',
                            portId: '',
                            name: 'SHAPE'
                        },
                        new go.Binding('fill', 'color'),
                        new go.Binding('opacity', 'opacity'),
                        new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                            return h ? 2 : 2;
                        }).ofObject(),
                        new go.Binding('fill', 'isHighlighted', function (h) {
                            return h ? '#FFD700' : '#ff99a8';
                        }).ofObject()),
                    $(go.Panel,
                        { // for each attribute show a Shape at a particular place in the overall circle
                            itemTemplate:
                                $(go.Panel,
                                    $(go.Shape,
                                        { stroke: null, strokeWidth: 0 },
                                        new go.Binding('fill', '', attrFill),
                                        new go.Binding('geometry', '', femaleGeometry))
                                ),
                            margin: 1
                        },
                        new go.Binding('itemArray', 'a')
                    )
                ),
                $(go.TextBlock,
                    { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' },
                    new go.Binding('text', 'name'), new go.Binding('opacity', 'opacity'))
            ));

        this.diagram.nodeTemplateMap.add('unknown',  // female
            $(go.Node, 'Vertical',
                {
                    movable: true,
                    locationSpot: go.Spot.Center,
                    locationObjectName: 'ICON',
                    selectionObjectName: 'ICON',
                    name: 'NODE2',
                    mouseEnter: mouseEnter,
                    mouseLeave: mouseLeave,
                    deletable: false,
                },
                // new go.Binding('opacity', 'hide', h => h ? 0 : 1),
                // new go.Binding('pickable', 'hide', h => !h),
                $(go.Panel,
                    { name: 'ICON' },
                    $(go.Shape, 'Triangle',
                        {
                            width: 40,
                            height: 40,
                            strokeWidth: 2,
                            fill: '#a1a1a1',
                            stroke: '#a1a1a1',
                            portId: '',
                            name: 'SHAPE'
                        },
                        new go.Binding('opacity', 'opacity'),
                        new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                            return h ? 2 : 2;
                        }).ofObject(),
                        new go.Binding('fill', 'isHighlighted', function (h) {
                            return h ? '#FFD700' : '#a1a1a1';
                        }).ofObject()),
                ),
                $(go.TextBlock,
                    { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' },
                    new go.Binding('text', 'name'), new go.Binding('opacity', 'opacity'))
            ));

        // the representation of each label node -- nothing shows on a Marriage Link
        this.diagram.nodeTemplateMap.add('LinkLabel',
            $(go.Node, {
                selectable: false,
                width: 1,
                height: 1,
                fromEndSegmentLength: 20,
                avoidable: false,
                layerName: 'Foreground'
            },
                // $('Shape', 'Ellipse',
                //     {
                //       width: 5, height: 5, stroke: null,
                //       portId: '', fromLinkable: true, toLinkable: true, cursor: 'pointer', fill: 'black',
                //     })
            ));


        this.diagram.linkTemplate =  // for parent-child relationships
            $(go.Link,
                {
                    routing: go.Link.AvoidsNodes,
                    fromSpot: go.Spot.Bottom,
                    toSpot: go.Spot.Top,
                    layerName: 'Background',
                    selectable: false,
                },
                $(go.Shape, { stroke: '#424242', strokeWidth: 0.5 },
                    new go.Binding('opacity', 'opacity'),
                    // shape stroke and width depend on whether Link.isHighlighted is true
                    // new go.Binding('stroke', 'isHighlighted', function(h) { return h ? '90EE90' : '#424242'; })
                    // .ofObject(),
                    new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                        return h ? 5 : 0.5;
                    }).ofObject(),
                )
                // new go.Binding('strokeWidth', 'isHighlighted', function(h) { return h ? 1 : 0.5; })
                // .ofObject())
            );

        this.diagram.linkTemplateMap.add('Marriage',  // for marriage relationships
            $(ArcLink,
                {
                    routing: go.Link.Normal,
                    fromSpot: go.Spot.Top,
                    toSpot: go.Spot.Top,
                    selectable: false,
                    layerName: 'Background'
                },
                $(go.Shape, { strokeWidth: 1, stroke: '#5d8cc1' /* blue */ }, new go.Binding('opacity', 'opacity'),
                    new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                        return h ? 5 : 0.5;
                    }).ofObject(),)
            ));

        this.diagram.linkTemplateMap.add('hasChild',  // between parents
            $(ArcLink,
                {
                    routing: go.Link.Normal,
                    fromSpot: go.Spot.Bottom,
                    toSpot: go.Spot.Bottom,
                    selectable: false,
                    layerName: 'Background',
                    click: function (e, link) {
                        // highlight all Links and Nodes coming out of a given Node
                        var diagram = link.diagram;
                        // node.shape.fill = '#7ec2d7'
                        diagram.startTransaction('highlight');
                        // remove any previous highlighting
                        diagram.clearHighlighteds();
                        link.isHighlighted = true;
                        // for each Link coming out of the Node, set Link.isHighlighted
                        link.findLinksOutOf().each(function (l) {
                            l.isHighlighted = true;
                        });
                        link.findLinksInto().each(function (l) {
                            l.isHighlighted = true;
                        });
                        // for each Node destination for the Node, set Node.isHighlighted
                        // node.findNodesOutOf().each(function(n) { n.isHighlighted = true; });
                        diagram.commitTransaction('highlight');
                    }
                },
                $(go.Shape, { strokeWidth: 1, stroke: '#ff0000' /* red */ }, new go.Binding('opacity', 'opacity'),
                    new go.Binding('strokeWidth', 'isHighlighted', function (h) {
                        return h ? 5 : 0.5;
                    }).ofObject(),)
            ));

        return this.diagram;
    }

    downloadSvg = (blob) => {
        const url = window.URL.createObjectURL(blob);
        const filename = 'family-tree.svg';

        const a = document.createElement('a');
        a.style = 'display: none';
        a.href = url;
        a.download = filename;

        // IE 11
        if (window.navigator.msSaveBlob !== undefined) {
            window.navigator.msSaveBlob(blob, filename);
            return;
        }

        document.body.appendChild(a);
        requestAnimationFrame(() => {
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    }

    makeSvg = () => {
        const svg = this.state.diagram.makeSvg({ scale: 1, background: 'white' });
        const svgstr = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgstr], { type: 'image/svg+xml' });
        this.downloadSvg(blob);
    }

    // create and initialize the Diagram.model given an array of node data representing people
    setupDiagram(array, focusId) {
        this.diagram.clear();
        this.diagram.model =
            new go.GraphLinksModel(
                { // declare support for link label nodes
                    linkLabelKeysProperty: 'labelKeys',
                    // this property determines which template is used
                    nodeCategoryProperty: 'gender',
                    // if a node data object is copied, copy its data.a Array
                    copiesArrays: true,
                    // create all of the nodes for people
                    //TODO this should be got from this.state.relationJSON from App.js
                    nodeDataArray: array
                });
        this.setupParents(this.diagram);
        this.setupMarriages(this.diagram);

        const node = this.diagram.findNodeForKey(focusId);
        if (node !== null) {
            this.diagram.select(node);

            // this.diagram.commandHandler.scrollToPart(node);
            this.diagram.centerRect(node.actualBounds);
        }
        this.diagram.layout.diagram = this.diagram;
        this.diagram.layout.personMap = this.props.personMap;
        
    }

    findMarriage(diagram, a, b) {  // A and B are node keys
        const nodeA = diagram.findNodeForKey(a);
        const nodeB = diagram.findNodeForKey(b);
        if (nodeA !== null && nodeB !== null) {
            const it = nodeA.findLinksBetween(nodeB);  // in either direction
            while (it.next()) {
                const link = it.value;
                // Link.data.category === 'Marriage' means it'gender a marriage relationship
                if (link.data !== null && link.data.category === 'Marriage') return link;
            }
        }
        return null;
    }

    findHasChild(diagram, a, b) {  // A and B are node keys
        const nodeA = diagram.findNodeForKey(a);
        const nodeB = diagram.findNodeForKey(b);
        if (nodeA !== null && nodeB !== null) {
            const it = nodeA.findLinksBetween(nodeB);  // in either direction
            while (it.next()) {
                const link = it.value;
                // Link.data.category === 'Marriage' means it'gender a marriage relationship
                if (link.data !== null && link.data.category === 'hasChild') return link;
            }
        }
        return null;
    }

    // now process the node data to determine marriages
    setupMarriages(diagram) {
        const model = diagram.model;
        const nodeDataArray = model.nodeDataArray;
        for (let i = 0; i < nodeDataArray.length; i++) {
            const data = nodeDataArray[i];
            const key = data.key;
            // filtering
            let uxs = data.spouse;
            if (uxs !== undefined) {
                if (typeof uxs === 'string') uxs = [uxs];
                for (let j = 0; j < uxs.length; j++) {
                    const wife = uxs[j];
                    const wdata = model.findNodeDataForKey(wife);
                    if (key === wife) {
                        console.log('cannot create Marriage relationship with self' + wife);
                        continue;
                    }
                    if (!wdata) {
                        console.log('cannot create Marriage relationship with unknown person ' + wife);
                        continue;
                    }
                    const link = this.findMarriage(diagram, key, wife);
                    if (link == null && diagram.findNodeForKey(wife)) {
                        const hasChildLink = this.findHasChild(diagram, key, wife);
                        // add a label node for the marriage link
                        // add the marriage link itself, also referring to the label node
                        var mdata = { from: key, to: wife, category: 'Marriage' };
                        if (!hasChildLink) {
                            const mlab = { gender: 'LinkLabel' };
                            model.addNodeData(mlab);
                            mdata.labelKeys = [mlab.key];
                        }
                        model.addLinkData(mdata);
                    }
                }
            }
        }
    }

    // process parent-child relationships once all marriages are known
    setupParents(diagram) {
        const model = diagram.model;
        const nodeDataArray = model.nodeDataArray;
        for (let i = 0; i < nodeDataArray.length; i++) {
            const data = nodeDataArray[i];
            const key = data.key;
            const mother = data.mother;
            const father = data.father;

            if (mother && father && diagram.findNodeForKey(father) && diagram.findNodeForKey(mother)) {
                var link = this.findHasChild(diagram, father, mother);
                if (link == null) {
                    // add a label node for the hasChild link
                    const mlab = { gender: 'LinkLabel' };
                    model.addNodeData(mlab);
                    this.diagram.model.addLinkData({
                        from: father,
                        to: mother,
                        labelKeys: [mlab.key],
                        category: 'hasChild'
                    });
                    link = this.findHasChild(diagram, father, mother);
                }

                const mdata = link.data;
                if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) {
                    console.log('Should not happen');
                    continue;
                }
                const mlabkey = mdata.labelKeys[0];
                const cdata = { from: mlabkey, to: key };
                this.diagram.model.addLinkData(cdata);
            }
        }
    }

    toggleOpacity() {
        // all model changes should happen in a transaction
        const hiddenPeople = this.hiddenPeople;
        this.diagram.model.commit(function (m) {
            m.nodeDataArray.forEach((d) => {
                if (hiddenPeople.has(d.key)) {
                    m.set(d, 'originalOpacity', d.opacity);
                    m.set(d, 'opacity', Opacity.hidden);
                } else if (d.originalOpacity !== undefined) {
                    m.set(d, 'opacity', d.originalOpacity);
                }
            });
        }, 'toggleOpacity');
    }

    render() {
        if (this.state.isFirstRender || this.props.updateDiagram) {
            this.state.isFirstRender = false;

            // From graph expand
            let focusId = this.getFocusPerson();
            if (focusId !== null) {
                this.setupDiagram(this.props.nodeDataArray, focusId);
            } else {
                this.setupDiagram(this.props.nodeDataArray, this.props.nodeDataArray[0].key);
            }
            this.highlight.length = 0;
        }

        if (this.props.recentre) {
            var node = this.diagram.findNodeForKey(this.getFocusPerson());
            if (node == null) {
                node = this.diagram.findNodeForKey(this.root);
            }
            if (node != null) {
                this.diagram.commandHandler.scrollToPart(node);
                this.diagram.select(node);
            }
        }

        if (this.props.recommit) {
            this.toggleOpacity();
        }

        if (true) {
            const highlight = this.highlight;
            const labelledNodes = {};
            this.diagram.startTransaction('highlight');
            this.diagram.clearHighlighteds();
            for (const key of highlight) {
                const node = this.diagram.findNodeForKey(key);
                if (!node) {
                    alert('This relation contains people that are not in the graph');
                    this.diagram.clearHighlighteds();
                    highlight.length = 0;
                    break;
                }
                node.isHighlighted = true;
                node.findLinksConnected().each(function (l) {
                    if (l.isLabeledLink) {
                        l.labelNodes.each((n) => labelledNodes[n] = l);
                    }
                });
            }

            for (const key of highlight) {
                const node = this.diagram.findNodeForKey(key);
                node.findLinksConnected().each(function (l) {
                    const otherNode = l.toNode.key === node.key ? l.fromNode : l.toNode;
                    if (highlight.includes(otherNode.key)) {
                        l.isHighlighted = true;
                    }
                    else if (labelledNodes[otherNode]) {
                        l.isHighlighted = true;
                        labelledNodes[otherNode].isHighlighted = true;
                    }
                });
            }
            this.diagram.commitTransaction('highlight');
        }

        if (this.props.zoomToDefault) {
            this.diagram.scale = 1;
        }
        return (
            <ReactDiagram
                ref={this.diagramRef}
                divClassName='diagram-component'
                initDiagram={() => this.diagram}
                nodeDataArray={this.props.nodeDataArray}
                linkDataArray={this.props.linkDataArray}
                modelData={this.props.modelData}
                onModelChange={this.props.onModelChange}
                skipsDiagramUpdate={this.props.skipsDiagramUpdate}
            />
        );
    }
}