'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}	
	plus(vector) {
        if (!(vector instanceof Vector)) {
            // некорректное сообщение об ошибке - position тут нет
            throw new Error('position must be Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
	times(n) {
		return new Vector(this.x * n, this.y * n);
	}
}

class Actor {    
	constructor(position = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) { 
        
        if (!(position instanceof Vector)) {
            throw new Error('position must be Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('size must be Vector');
        }
        if (!(speed instanceof Vector)) {
            throw new Error('speed must be Vector');
        }
        
        this.pos = position;
		this.size = size;
		this.speed = speed;
    }
    get type() {
        return 'actor';
    }
    get left() {
        return this.pos.x;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get top() {
        return this.pos.y;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
	act() {
	}    
	isIntersect(actor) {        
	    if (!(actor instanceof Actor)) { 
            throw new Error('actor must be Actor');
        }
        if (actor === this) {
            return false;
        } 
        if (actor.left >= this.right) {
            return false;
        } 
        if (actor.top >= this.bottom) {
            return false;
        } 
        if (actor.right <= this.left) {
            return false;
        } 
        if (actor.bottom <= this.top) {
            return false;
        }
        return true;
	}
}

class Level {
	constructor(grid = [], actors = []) {
        
        this.grid = grid.slice();
        this.actors = actors.slice();
		this.status = null;
        this.finishDelay = 1; 
        
        this.width = this.grid.reduce(function(bestLength, newLine) {
                    if (newLine.length > bestLength) {
                            return newLine.length;
                    }
                    return bestLength;
        }, 0);
            
        this.height = this.grid.length;
	}
    get player() {
       return this.actors.find(actor => actor.type === 'player');
    }
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
	}
    actorAt(actor = undefined) {
        if (!(actor instanceof Actor)) { 
            throw new Error('actor must be Actor');
        }
        return this.actors.find(other => actor.isIntersect(other));
    }
    obstacleAt(pos, size) {
        let xStart = Math.floor(pos.x);
        let xEnd = Math.ceil(pos.x + size.x);
        let yStart = Math.floor(pos.y);
        let yEnd = Math.ceil(pos.y + size.y);

        if (xStart < 0 || xEnd > this.width || yStart < 0) {
            return "wall";
        }
        if (yEnd > this.height) {
            return "lava";
        }
        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                let fieldType = this.grid[y][x];
                if (fieldType) {
                    return fieldType;
                }                
            }
        }
    }    
    removeActor(actor) {
        this.actors = this.actors.filter(other => other !== actor);
    }
    noMoreActors(type = '') {
        return !this.actors.some(actor => actor.type === type);        
    }
    playerTouched(type, actor) {
	    // сейчас монету можно подобрать даже после столкновения с шаровой молнией
        // посмотрите описание метода playerTouched
       if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
            return 'lost';
       }
       if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
                return 'won';
            }
        }
    }
}

class LevelParser {
    constructor(list = {}) {
        // лучше создать копию объекта, чтобы нельзя было модифицировать из вне
        this.list = list;
    }  
    actorFromSymbol(symbol = undefined) {
        return this.list[symbol];
    }
    obstacleFromSymbol(symbol = undefined) {
        switch (symbol) {
            case 'x':
                return 'wall';          
            case '!':
                return 'lava';          
            default:
                return undefined;        
        }
    }
    createGrid(plan = []) {
        // symbol
       return plan.map(line => line.split('').map(simbol =>   
                                this.obstacleFromSymbol(simbol)));       
    }    
    createActors(plan = []) { 
        let actors = [];    
        plan.forEach((line, x) => {
            line.split('').forEach((element, y) => {
                let classA = this.actorFromSymbol(element);
                if (typeof(classA) === 'function') {
                    // лучше переименовать x в y, а то сейчас названия обманывают
                    let actor = new classA(new Vector(y, x));
                    if (actor instanceof Actor) {
                        actors.push(actor);
                    }
                }
            })
        });
        return actors;
    }
    parse(plan = []) {
        let grid = this.createGrid(plan);
        let actors = this.createActors(plan);
        return new Level(grid, actors);        
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed); 
    }
    get type() {
        return 'fireball';
    }
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
    act(time, level) {   
        let newPos = this.getNextPosition(time);
        if (level.obstacleAt(newPos, this.size)) {
            this.handleObstacle(); 
        } else { 
            this.pos = newPos;
        }       
    }
}    

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2)); 
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
        this.startPosition = pos;           
    }
    get type() {
        return 'fireball';
    }
    handleObstacle() {
        this.pos = this.startPosition;
    }
} 

class Coin extends Actor {
    constructor(pos) {
        // тут всё таки лучше поставить значение по-умолчанию и передать рассчитанный pos в super
        super(pos, new Vector(0.6, 0.6));
        this.pos = this.pos.plus(new Vector(0.2, 0.1));
        this.springSpeed = 8;
        this.springDist = 0.07;
        
        let max = 0;
        let min = 2 * Math.PI;
        this.spring = Math.random() * (max - min) + min;
   }
   get type() {
        return 'coin';
   }
   updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
   }
   getSpringVector(x = 0, y = 0) {
       return new Vector(x, y + Math.sin(this.spring) * this.springDist);
   }
   getNextPosition(time = 1) {
       this.updateSpring(time);
       return this.getSpringVector(this.pos.x, this.pos.y);
   }
   act(time = 1) {
       this.pos = this.getNextPosition(time);
   } 
}

class Player extends Actor {
    constructor(pos) {
        // тут всё таки лучше поставить значение по-умолчанию и передать рассчитанный pos в super
        super(pos, new Vector(0.8, 1.5));
        this.pos = this.pos.plus(new Vector(0, -0.5));
        // форматирование
        }  
    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};

const parser = new LevelParser(actorDict);

// Монетки должны двигаться в пределах своей ячейки, сейчас они заезжают на стены
loadLevels()
    .then(JSON.parse)
    .then(levels => runGame(levels, parser, DOMDisplay)
          .then(() => alert('Вы победили!')));