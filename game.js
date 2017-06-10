'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}	
	plus(vector) {
	    // тут лучше обратить условие: если не вектор, то исключение, а потом основной кейс.
        // Лучше потому что в таком случае основной код имеет меньшую вложенность
        if (vector instanceof Vector) {
            return new Vector(this.x + vector.x, this.y + vector.y);
        }
        throw new Error('position must be Vector');
    }
	times(n) {
		return new Vector(this.x * n, this.y * n);
	}
}

class Actor {    
	constructor(position = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) { 
	    // лишнее поле класса
        this.err = new Error('position must be Vector');
        
        // Здесь можно не сокращать код - на каждое условие выкидывать new Error с нужным сообщением
        // фигурные скобки у if лучше не опускать
        if (!(position instanceof Vector)) throw this.err;
        if (!(size instanceof Vector)) throw this.err;
        if (!(speed instanceof Vector)) throw this.err;
        
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
	        // тут будет сообщение position must be Vector, лучше создать новую ошибку (new Error)
            throw this.err;
        }
        if (actor === this) {
            return false;
        // тут и ниже else можно не писать, т.к. if заканчивается на return
        } else if (actor.left >= this.right) {
            return false;
        } else if (actor.top >= this.bottom) {
            return false;
        } else if (actor.right <= this.left) {
            return false;
        } else if (actor.bottom <= this.top) {
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
        
        let goodLength = 0;
        // проверка длины тут не нужна, forEach на пустом массиве просто не вызовет переданную функцию
        if (this.grid.length > 0) {
            // давает попробуем тут использовать метод reduce - признак программисткого мастерства :)
            this.grid.forEach(function(line) { 
                                if (line.length > goodLength) {
                                    goodLength = line.length;
                                }});
        }
        this.width = goodLength;
        this.height = this.grid.length;
	}
    get player() {
       return this.actors.find(actor => actor.type === 'player');
    }
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
	}
    actorAt(actor = undefined) {
	    // если не передать аргумент функции произойдёт ошибка
        // тут лучше проверить, что actor является объектом класса Actor
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
       let grid = [];      
       // предлагаю тут сделать через forEach и map
       for (let y in plan) {
            let line = plan[y].split(''); 
            for (let x in line) {
                line[x] = this.obstacleFromSymbol(line[x]);
            }
            grid.push(line);
       }       
       return grid;
    }    
    createActors(plan = []) { 
        let actors = [];    
        // попробуйте написать это через 2 forEach
        for (let x = 0; x < plan.length; x++) {
            for (let y = 0; y < plan[x].length; y++) {
                let classA = this.actorFromSymbol(plan[x][y]);
                if (typeof(classA) === 'function') {
                    let actor = new classA(new Vector(y, x));
                    if (actor instanceof Actor) {
                        actors.push(actor);
                    }
                }
            }
        }
        return actors;
    }
    parse(plan = []) {
        let grid = this.createGrid(plan);
        let actors = this.createActors(plan);
        return new Level(grid, actors);        
    }
}


class Fireball extends Actor {
    // Конструктор должен принимать 2 аргумента: координаты и сокрость
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0), size = new Vector(1, 1)) {
        super(pos, speed, size); 
        // эти поля должны заполняться в базовом корструкторе
        this.speed = speed; 
        this.size = size;
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
        // лучше стараться не использовать условие с отрицанием
        // если тут обратить условие, то код станет понятнее
        if (!level.obstacleAt(newPos, this.size)) {
            this.pos = newPos;
        } else { 
            this.handleObstacle(); 
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
    // конструктор должен принимать 1 аргумент: координаты
    constructor(position = new Vector(0, 0), speed = new Vector(0, 3)) {
        super(position, speed);
        // лучше переназвать поле вроде startPosition или initialPosition
        this.position = position;   
        
    }
    get type() {
        return 'fireball';
    }
    handleObstacle() {
        this.pos = this.position;
    }
} 

class Coin extends Actor {
    constructor(pos) {
        super(pos);
        // pos и size должны задаваться через конструктор базового класса
        this.pos = this.pos.plus(new Vector(0.2, 0.1));
        this.size = new Vector(0.6, 0.6);
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
   // лучше поставить значение по умолчанию, чтобы не умножать на undefined
   act(time) {
       this.pos = this.getNextPosition(time);
   } 
}

class Player extends Actor {
    constructor(pos) {
        super(pos, new Vector(0.8, 1.5));
        // должно задаваться через конструктор базового класса
        this.pos = this.pos.plus(new Vector(0, -0.5));
        // форматирование
        }  
    get type() {
        return 'player';
    }
}


// Здесь нужно запустить игру (см. раздел "Реализованные компоненты, которые необходимо использовать")

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then(JSON.parse)
  .then(levels => runGame(levels, parser, DOMDisplay)
       .then(() => alert('Вы победили!')));
       
       
       
       