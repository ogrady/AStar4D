       // from https://stackoverflow.com/a/7120353/5736269
        Array.prototype.randomElement = function () {
            return this[Math.floor(random.next * this.length)]
        }

        class Random {
            constructor(seed) {
                if(isNaN(seed)) {
                    // catch strings
                    seed = undefined;
                }
                this.seed = seed || 100;
            }

            // from https://stackoverflow.com/a/19303725/5736269
            get next() {
                var x = Math.sin(this.seed++) * 10000;
                return x - Math.floor(x);            
            }
        }

        class Vector {
            constructor(x,y) {
                this.x = x;
                this.y = y;
            }

            get length() { 
                return Math.sqrt(this.x * this.x + this.y * this.y); 
            }

            get normalised() { 
                let l = this.length;
                return l !== 0 ? this.multiplied(1/l) : this; 
            }

            get clone() {
                return new Vector(this.x,this.y);
            }

            multiplied(f) {
                this.x *= f;
                this.y *= f;
                return this;
            }

            added(other) { 
                this.x += other.x;
                this.y += other.y;
                return this;
            }

            substracted(other) {
                this.x -= other.x;
                this.y -= other.y;
                return this;
            }

            distance(other) {
                let x1 = this.x;
                let y1 = this.y;
                let x2 = other.x;
                let y2 = other.y;
                return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
            }

            scaled(f) { 
                return this.normalised.multiplied(f); 
            }

            equals(other) { 
                return this.x === other.x && this.y === other.y; 
            }

            toString() {
                return "(" + this.x + "|" + this.y + ")";
            }
        }

        class Coordinate {
            constructor(x,y) {
                this.x = x;
                this.y = y;
            }

            equals(other) { 
                return this.x === other.x && this.y === other.y; 
            }

            toString() {
                return "[" + this.x + "|" + this.y + "]";
            }
        }

        class Dimensions {
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }
        }

        class Renderer {
            update(delta) {}
        }

        class StaticRenderer extends Renderer {
            constructor(dot, stage, image) {
                super();
                this.dot = dot;
                this.stage = stage;
                this.alive = true;
                //https://banner2.kisspng.com/20180330/uwe/kisspng-pixel-art-sprite-rocks-5abdc79bb57505.6129861015223868437433.jpg
                this.image = PIXI.Sprite.fromImage(image, true);

                let w = 90; // constants bad :^(
                let h = 65;
                this.image.width = w;
                this.image.height = h;
                this.image.x = dot.position.x - w/2;
                this.image.y = dot.position.y - h/2;
                stage.addChild(this.image);
            }
        }

        class DotRenderer extends Renderer {
            constructor(dot, stage, radius, hexcol) {
                super();
                let outcol = (hexcol & 0xfefefe) >> 1;
                this.dot = dot;
                this.stage = stage;
                this.alive = true;
                this.circle = new PIXI.Graphics();
                // outline
                this.circle.beginFill(outcol);
                this.circle.drawCircle(0,0,radius+1);
                this.circle.endFill();
                // dot
                this.circle.beginFill(hexcol);
                this.circle.drawCircle(0, 0, radius);
                this.circle.endFill();
                // shine
                this.circle.beginFill(0xffffff,0.1);
                this.circle.drawCircle(0, 0, radius-2);
                this.circle.endFill();
                
                // path
                this.lines = [];
                this.fadingLines = [];
                this.line = new PIXI.Graphics();
                let current = dot.position;
                for(let i = 0; i < this.dot.path.length; i++) {
                    let next = this.dot.path[i];
                    let line = new PIXI.Graphics();
                    line.lineStyle(2,hexcol).moveTo(current.x, current.y);
                    line.lineTo(next.x,next.y);
                    current = next;
                    stage.addChild(line);
                    this.lines.push(line);
                }

                stage.addChild(this.circle);
                dot.listeners.add(this);
            }

            onReachedCheckpoint() {
                this.fadingLines.push(this.lines.shift());
            }

            update(stage) {
                if(this.alive) {
                    this.circle.x = this.dot.position.x;
                    this.circle.y = this.dot.position.y;
                    for(let i = 0; i < this.fadingLines.length; i++) {
                        this.fadingLines[i].alpha -= DotRenderer.fadeDelta;
                    }
                }
            }

            destroy() {
                if(this.alive) {
                    this.stage.removeChild(this.circle);
                    this.stage.removeChild(this.line);
                    for(let i = 0; i < this.fadingLines.length; i++) {
                        this.stage.removeChild(this.fadingLines[i]);
                    }
                    this.dot.listeners.delete(this);
                    this.dot = null;
                    this.circle = null;
                    this.alive = false;
                }
            }

            onDie(dot) {
                this.destroy();
            }
        }
        DotRenderer.fadeDelta = 0.04;

        class CellRenderer extends Renderer {
            constructor(cell, stage, dim) {
                super();
                this.cell = cell;
                this.stage = stage;
                this.dimensions = dim;
                this.rect = new PIXI.Graphics();
                this.rect.lineStyle(1,this.goodcol);
                this.rect.drawRect(this.cell.coordinate.x * dim.width, this.cell.coordinate.y * dim.height, dim.width, dim.height);
                
                stage.addChild(this.rect);
                this.marked = false;
            }

            get goodcol() { return 0x094D5D; }
            get badcol()  { return 0xFF0000; }

            mark() {
                if(!this.marked) {
                    return;
                    let dim = this.dimensions;
                    this.rect.lineStyle(2,this.badcol);
                    this.rect.beginFill(this.badcol);
                    this.rect.drawRect(this.cell.coordinate.x * dim.width, this.cell.coordinate.y * dim.height, dim.width, dim.height);
                    this.marked = true;
                }
            }

            onCollision(payload) {
                let c = payload.cell;
                if(c.coordinate.equals(this.cell.coordinate)) {
                    this.mark();
                }
            }
        }

        class EventEmitter {
            constructor() {
                this.listeners = new Set();
            }

            notify(event, payload) {
                for(let l of this.listeners) {
                    let f = l[event];
                    if(f) {
                        f.bind(l)(payload);
                    }
                }
            }            
        }

        class Actor extends EventEmitter {
            constructor(game, pos, speed, path) {
                super();
                this.id = Actor.nextId++;
                this.game = game;
                this.pos = pos;
                this.speed = speed;
                this.path = path || [];
                this.alive = true;
            }

            destroy() {
                if(this.alive === true) {
                    this.game.despawn(this.id);
                    this.game = null;
                    this.pos = null;
                    this.speed = null;
                    this.alive = false;
                    this.notify("onDie", this);
                }
            }

            set position(np) {
                this.pos.x = np.x;
                this.pos.y = np.y;
            }

            get position() {
                return this.pos;
            }

            moveTowards(pos) {
                let delta = new Vector(pos.x - this.pos.x, pos.y - this.pos.y)
                this.position.added(delta.scaled(Math.min(delta.length, this.speed)));
            }

            estimateTime(src, dst) {
                return Math.ceil(src.distance(dst)/this.speed);
            }

            update(delta) {
                if(this.path.length === 0) {
                    // reached destination
                    this.destroy();
                } else if(this.path[0].equals(this.position)) {
                    // reached checkpoint
                    let v = this.path.shift();
                    this.notify("onReachedCheckpoint", {"dot": this, "checkpoint": v});
                    // FIXME: remove for waiting!
                    //this.update(0); // call again to not waste a cycle
                } else {
                    // move to next checkpoint
                    this.moveTowards(this.path[0]);
                }
            }
        }
        Actor.nextId = 0;

        class StaticObject extends Actor {
            constructor(game, pos) {
                super(game, pos, 0, []);
            }

            update(delta) {}
        }

        class AStar {
            constructor(grid) {
                this.openlist = [];
                this.closedlist = [];
                this.grid = grid;
            }

            // Checks, whether a Cell is already in the open list.
            // If so, it returns the corresponding AStarNode from the
            // open list. If not, it returns NULL.
            // Cell -> Maybe(AStarNode)
            inOpenList(c) {
                let i = this._indexOf(this.openlist, c, (x,y) => x.equals(y.element));
                return i > -1 ? this.openlist[i] : null;
            }

            // Looks for the index of an element x in a list xs.
            // f is a comparator, where the first parameter is always
            // x and the second is each element of xs.
            // [a] -> b -> (b -> a -> bool) -> int
            _indexOf(xs, x, f) {
                let i = 0;
                while(i < xs.length && !f(x,xs[i])) {
                    i++;
                }
                return i < xs.length ? i : -1;
            }

            // Checks, whether a Cell is in the closed list.
            // Cell -> bool
            inClosedList(c) {
                return this._indexOf(this.closedlist, c
                                   //,([xe,xt],[ye,yt]) => xt === yt && xe.equals(ye)) > -1;
                                   ,([xe,xt],[ye,yt]) => xe.equals(ye)) > -1;
            }

            // Puts an AStarNode into the open list, ordered by
            // its g value.
            // AStarNode -> Unit
            enqueue(n) {
                let i = 0;
                while(i < this.openlist.length && this.openlist[i].g < n.g) {
                    i++;
                }
                this.openlist.splice(i,0,n);
            }

            // Re-enqueues an AStarNode by removing it and inserting it again.
            // This is used to keep the list ordered after updating a g value.
            // AStarNode -> Unit
            requeue(n) {
                let i = this._indexOf(this.openlist, n
                                    ,(x,y) => x.element.equals(y.element));
                if(i > -1) {
                    this.openlist.splice(i,1);
                }
                this.enqueue(n);
            }

            // Reconstructs a path from an AStarNode 
            // by following the predecessors.
            // AStarNode -> [Vector]
            reconstructPath(n) {
                let path = [];
                while(n !== null) {
                    path.unshift(n.element.center);
                    n = n.predecessor;
                }
                return path;
            }

            fixPath(p) {
                let known = {};
                for(let i = 0; i < p.length; i++) {
                    let n = p[i];
                    if(n in known) {
                        for(let j = known[n]; j < i; j++) {
                            p[j] = n;
                        }
                    }
                    known[n] = i;
                }
            }

            // Vector -> Vector -> int -> [Vector]
            findPath(srcV, dstV, it, actor) {
                let src = this.grid.posToCell(srcV);
                let dst = this.grid.posToCell(dstV);
                this.openlist = [new AStarNode(src,0,it,null)];             
                
                do {
                    let current = this.openlist.shift(); // ordered by g value
                    if(current.element.equals(dst)) {
                        return this.reconstructPath(current);
                    }
                    // FIXME: this prevents the "waiting"
                    this.closedlist.push([current.element,it]);
                    this.expand(current, dst, actor);
                } while(this.openlist.length > 0);
                return [];
            }

            // AStarNode -> Cell -> Actor -> Unit
            expand(current, dst, actor) {
                // waiting costs more than moving
                let c = (c,n) => c.coordinate.equals(n.coordinate) ? 2 : 1;
                let h = n => Math.abs(dst.coordinate.x - n.coordinate.x + dst.coordinate.y - n.coordinate.y);

                let ns = this.neighbours(current,actor);
                for(let i = 0; i < ns.length; i++) {
                    let [n,est] = ns[i];
                    
                    if(this.inClosedList([n,est])) {
                        continue;
                    }

                    // opportunity to use est in c()?
                    let tmpg = current.g + c(current.element, n);
                    let former = this.inOpenList(n);

                    if(former !== null && tmpg >= former.g) {
                        continue;
                    }

                    let f = tmpg + h(n);
                    let newtime = current.time + est;
                    if(former !== null) {
                        former.g = f;
                        former.time = newtime;
                        former.predecessor = current; 
                        this.requeue(former);
                    } else {
                        this.enqueue(new AStarNode(n, f, newtime, current));
                    }
                }

            }

            // Here, Cells are their own neighbours to siginify waiting.
            // AStarNode -> Actor -> [Cell]
            neighbours(current, actor) {
                let n = current.element;
                let it = current.time;
                let ns = [];
                for(let i = -1; i < 2; i++) {
                    for(let j = -1; j < 2; j++) {
                        let c = this.grid.get(n.coordinate.x + i
                                            , n.coordinate.y + j);
                        if(c !== undefined) {

                            let est = actor.estimateTime(n.center,c.center); // estimate to get from one center to another
                            let pstart = Math.floor(it + est * 0.5);
                            let pend = Math.ceil(it + est * 1.5);
                            if(    (i != 0 || j != 0) // not center
                                && (i == 0 || j == 0) // no diagonals
                                && c.freeRange(pstart,pend) // filter out occupied cells already
                                //&& !this.inClosedList(c)
                            ) {
                                ns.push([c,est,pstart,pend]);
                            }

                        }
                    }
                }
                // append self as own neighbour to enable WAIT-operations
                ns.push([n,1,it+0,it+7]);
                return ns;
            }
        }

        class AStarNode {
            constructor(el, g, time, predecessor) {
                this.element = el;
                this.g = g;
                this.time = time;
                this.predecessor = predecessor;
            }
        }

        class Grid {
            constructor(size, cellsize) {
                this.cellsize = cellsize;
                this.cells = [];
                for(let x = 0; x < size.width; x++) {
                    let inner = [];
                    for(let y = 0; y < size.height; y++) {
                        inner.push(new Cell(new Coordinate(x,y), this));
                    }
                    this.cells.push(inner);
                }
            }

            get width() { 
                return this.cells.length; 
            }

            get height() {
                return this.cells[0].length; 
            }

            get(x,y) {
                return this.inBounds(x,y) ? this.cells[x][y] : undefined; 
            }
            set(x,y,v) { 
                this.cells[x][y] = v; 
            }

            inBounds(x,y) {
                return 0 <= x && x < this.width
                    && 0 <= y && y < this.height;
            }



            // Vector -> Cell
            posToCell(v) {
                let x = Math.floor(v.x/this.cellsize.width);
                let y = Math.floor(v.y/this.cellsize.height);
                return this.get(x,y);
            }

            map(f) {
                for(let i = 0; i < this.width; i++) {
                    for(let j = 0; j < this.height; j++) {
                        f(this.get(i,j));
                    }
                }
            }
        }

        class Cell {
            constructor(coord, grid, dim, statobj) {
                this.coordinate = coord;
                this.grid = grid;
                this.reservations = {};
                this.staticObject = statobj;
            }

            get size() { 
                return this.grid.cellsize; 
            }

            get center() { 
                return new Vector(
                         this.coordinate.x * this.size.width + this.size.width / 2
                        ,this.coordinate.y * this.size.height + this.size.height / 2 ); 
            }

            equals(other) {
                return this.coordinate.equals(other.coordinate);
            }

            book(actor, iteration) {
                /*if(!(iteration in this.reservations)) {
                    this.reservations[iteration] = new Set();
                }
                this.reservations[iteration].add(actor);
                */
                // ^ to allow more than one actor per timestep and cell
                if(iteration in this.reservations) {
                    // throw "Cell is already booked.";
                }
                this.reservations[iteration] = actor;
            }

            bookRange(actor, from, to) {
                let i = from;
                while(i <= to) {
                    this.book(actor, i);
                    i++;
                }
            }

            free(iteration) {
                return !this.staticObject && !(iteration in this.reservations);
            }

            freeRange(from, to) {
                if(this.staticObject) return false;
                let i = from;
                while(i <= to && !(i in this.reservations)) {
                    i++;
                }
                return i > to;
            }

            cleanUpBookings(before) {
                for(let i in this.reservations) {
                    if(i < before) {
                        delete this.reservations[i];
                    }
                }
            }
        }

        class Game extends EventEmitter {
            constructor(canvas, width, height) {
                super();
                this.canvas = canvas;
                let cellsize = new Dimensions(this.stageWidth/width, this.stageHeight/height);
                this.grid = new Grid(new Dimensions(width, height), cellsize);
                this.actorRadius = Math.min(this.cellWidth,this.cellHeight)/4;
                this.actors = {};
                this.accu = 0;
                this.iteration = 0;
                this.grid.map(c => {
                    let cr = new CellRenderer(c, this.context, cellsize);
                    this.listeners.add(cr);
                });
            }

            get stageWidth()  { return this.canvas._options.width; }
            get stageHeight() { return this.canvas._options.height; }
            get context()     { return this.canvas.stage; }

            findPath(src, dst, actor) {
                return new AStar(this.grid).findPath(src, dst, this.iteration, actor);
            }

            randomCol() {
                let vs = [0,1,2,3,4,5,6,7,8,9,"A","B","C","D","E","F"];
                let hex = "0x";
                for(let i = 0; i < 6; i++) {
                    hex += vs.randomElement();
                }
                return hex;
            }

            randomInt(max) {
                return Math.floor(random.next * Math.floor(max));
            }

            randomPos() {
                return new Vector(this.randomInt(this.stageWidth)
                                , this.randomInt(this.stageHeight));
            }

            addDot(d) {
                this.actors[d.id] = [d, new DotRenderer(d, this.context, 5, this.randomCol())];
            }

            addStatic(s) {
                this.actors[s.id] = [s, new StaticRenderer(s, this.context, "rock.png")];
            }

            // Coordinate -> Coordinate -> int
            manhattenDistance(src, dst) {
                return Math.abs(src.x - dst.x + src.y - dst.y);
            }

            spawnNavigatedDot() {
                let src;
                // find a cell that is currently not occupied
                do {
                    src = this.grid.posToCell(this.randomPos());  
                } while(!src.freeRange(this.iteration-100,this.iteration+100));
                src = src.center;

                let dst = this.grid.posToCell(this.randomPos()).center;
                let actor = new Actor(this, src, 2, []);
                let path = this.findPath(src,dst,actor);
                actor.path = path;                
                let i = 0;
                let then = this.iteration - 1;
                let current = src;
                let next = src;
                while(i < path.length) {
                    current = next;
                    next = path[i++];
                    let est = actor.estimateTime(current,next);
                    let pstart = Math.floor(then + est * 0.5);
                    let pend = Math.ceil(then + est * 1.5);
                    then += est + 1;
                    //this.grid.posToCell(next).book(actor, then);
                    this.grid.posToCell(next).bookRange(actor, pstart, pend);
                    let c = this.grid.posToCell(next);
                }
                this.addDot(actor);
                actor.listeners.add(this);
            }

            onReachedCheckpoint(payload) {
                let a = payload.dot;
                let c = this.grid.posToCell(payload.checkpoint);
                if(!(this.iteration in c.reservations) || c.reservations[this.iteration].id != a.id) {
                    //throw "unexpected actor";
                }
            }

            spawnRandomDot() {
                let pos = this.randomPos();
                let path = [];
                for(let i = 0; i < 4; i++) {
                    path.push(this.randomPos());
                }
                this.addDot(new Actor(this, pos, 2, path));
            }

            spawnStaticObjectAt(x,y) {
                let cell = this.grid.get(x,y);
                let so = new StaticObject(this, cell.center);
                cell.staticObject = so;
                this.addStatic(so)
            }

            despawn(aid) {
                delete this.actors[aid];
            }

            update(delta) {
                this.iteration++;
                this.accu += delta;
                if(this.accu >= 50) {
                    //this.spawnRandomDot();    
                    this.spawnNavigatedDot();
                    this.accu = 0;
                }
                // clean up the bookings every once in a while
                if(this.iteration%100 == 0) {
                    //this.grid.map(c => c.cleanUpBookings(this.iteration));
                }
                let occupied = {};
                for(let i in this.actors) {
                    let [ac,r] = this.actors[i];
                    ac.update(delta);
                    r.update(delta);
                    if(ac.alive) {
                        let p = this.grid.posToCell(ac.position);
                        let k = p.coordinate.toString();
                        if(ac.constructor.name !== "StaticObject") {
                            if(k in occupied) {
                                this.notify("onCollision",
                                {
                                    "game": this,
                                    "colliders": [occupied[k], ac],
                                    "cell": p
                                });
                            } else {
                                occupied[k] = ac;
                            }
                        }
                    }
                }
            }
        }