import * as go from "gojs";

export class ArcLink extends go.Link {
    rotate(x, y, rad) {
        return {
            x: x * Math.cos(rad) - y * Math.sin(rad),
            y: y * Math.cos(rad) + x * Math.sin(rad)
        };
    }

    findCircle(x1, y1, x2, y2, x3, y3) {
        var x12 = (x1 - x2);
        var x13 = (x1 - x3);

        var y12 = (y1 - y2);
        var y13 = (y1 - y3);

        var y31 = (y3 - y1);
        var y21 = (y2 - y1);

        var x31 = (x3 - x1);
        var x21 = (x2 - x1);

        //x1^2 - x3^2
        var sx13 = Math.pow(x1, 2) - Math.pow(x3, 2);

        // y1^2 - y3^2
        var sy13 = Math.pow(y1, 2) - Math.pow(y3, 2);

        var sx21 = Math.pow(x2, 2) - Math.pow(x1, 2);
        var sy21 = Math.pow(y2, 2) - Math.pow(y1, 2);

        var f = ((sx13) * (x12)
                + (sy13) * (x12)
                + (sx21) * (x13)
                + (sy21) * (x13))
            / (2 * ((y31) * (x12) - (y21) * (x13)));
        var g = ((sx13) * (y12)
                + (sy13) * (y12)
                + (sx21) * (y13)
                + (sy21) * (y13))
            / (2 * ((x31) * (y12) - (x21) * (y13)));

        var c = -(Math.pow(x1, 2)) -
            Math.pow(y1, 2) - 2 * g * x1 - 2 * f * y1;

        // eqn of circle be
        // x^2 + y^2 + 2*g*x + 2*f*y + c = 0
        // where centre is (h = -g, k = -f) and radius r
        // as r^2 = h^2 + k^2 - c
        var h = -g;
        var k = -f;
        var sqr_of_r = h * h + k * k - c;

        // r is the radius
        var r = Math.sqrt(sqr_of_r);
        return {
            cX: h, cY: k, r: r
        };
    }

    computePoints() {
        var fromnode = this.fromNode;
        if (!fromnode) return false;
        var fromport = this.fromPort;
        var fromspot = this.computeSpot(true);
        var tonode = this.toNode;
        if (!tonode) return false;
        var toport = this.toPort;
        var tospot = this.computeSpot(false);
        var frompoint = this.getLinkPoint(fromnode, fromport, fromspot, true, true, tonode, toport);
        if (!frompoint.isReal()) return false;
        var topoint = this.getLinkPoint(tonode, toport, tospot, false, true, fromnode, fromport);
        if (!topoint.isReal()) return false;

        this.clearPoints();
        this.addPoint(frompoint);

        let fx = frompoint.x;
        let fy = frompoint.y;
        let tx = topoint.x;
        let ty = topoint.y;
        let slopeAngle = Math.atan2(ty - fy, tx - fx);
        let rotatedFromPoint = this.rotate(fx, fy, -slopeAngle);
        let rotatedToPoint = this.rotate(tx, ty, -slopeAngle);

        var dia = Math.sqrt((fx - tx) * (fx - tx) + (fy - ty) * (fy - ty));
        let height = Math.min(30, dia / 5);

        let midX = (rotatedFromPoint.x + rotatedToPoint.x) / 2;
        let midY = rotatedFromPoint.y + height * ((fx > tx) != (this.fromSpot === go.Spot.Bottom) ? 1 : -1);

        let circle = this.findCircle(rotatedFromPoint.x, rotatedFromPoint.y, rotatedToPoint.x, rotatedToPoint.y, midX, midY);
        let parametric = (t) => {
            return {
                x: circle.r * Math.cos(t) + circle.cX,
                y: circle.r * Math.sin(t) + circle.cY
            };
        };
        let startAngle = Math.atan2(rotatedFromPoint.y - circle.cY, rotatedFromPoint.x - circle.cX);
        let endAngle = Math.atan2(rotatedToPoint.y - circle.cY, rotatedToPoint.x - circle.cX);
        let increment = (endAngle - startAngle) / 10;
        for (var currentAngle = startAngle;
             startAngle < endAngle ? currentAngle <= endAngle : currentAngle >= endAngle;
             currentAngle += increment) {
            let parametricResult = parametric(currentAngle);
            let point = this.rotate(parametricResult.x, parametricResult.y, slopeAngle);
            this.addPointAt(point.x, point.y);
        }
        this.addPoint(topoint);
        this.updateTargetBindings();
        return true;
    }
}