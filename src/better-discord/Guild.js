class Guild{
    /**
     * 
     * @param {String} name 
     * @param {Number} id 
     */
    constructor(name, id){
        this.name = name;
        this.id = id;
    }

    toString(){
        return `$${this.id}`;
    }

    get repr(){
        return this.name;
    }
}

module.exports = Guild;