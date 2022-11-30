export class GroupModel {
    constructor() {
        // // Old
        // this.globalSet = new Set()
        // this.groupSet = new Set()
        // this.groupItemSet = new Set()

        // New
        this.defaultProperties = new Set(); // Default shown properties

        this.currentGroupId = 0; // Currently shown group
        this.groupsCount = 1;

        this.groupsList = { 0 : {
            members: new Set(),
            properties: new Set()
        }};
    }

    /* ### Initialize ### */
    initialize(initialSet) {
        this.defaultProperties = new Set([...initialSet]);
        this.groupsList[this.currentGroupId].properties = new Set([...initialSet]);

        // console.log(this.groupsList[this.currentGroupId]);
    }

    /* ### Whole group operations ### */
    addNewGroup() {
        this.groupsList[this.groupsCount] = {
            members: new Set(),
            properties: new Set()
        };
        this.groupsCount += 1;
    }

    /* ### Getters ### */
    getCurrGroupMembers() {
        return this.groupsList[this.currentGroupId].members;
    }

    getCurrGroupProperties() {
        return this.groupsList[this.currentGroupId].properties;
    }

    getDefaultProperties() {
        return this.defaultProperties;
    }

    /* ### Setters ### */
    setCurrentGroupId(groupId) {
        this.currentGroupId = groupId;
    }

    addPersonToGroup(personId) {
        this.groupsList[this.currentGroupId].members.add(personId);
    }

    removePersonFromGroup(personId) {
        this.groupsList[this.currentGroupId].members.delete(personId);
    }

    /* Checker for properties */
    checkPropertyShownForPerson(personId, property) {
        /*
         * If:
         * 1. ANY one group containing this person has the property, or
         * 2. person blongs to NO group AND the property is displayed by default, 
         * then this property is displayed.
         */
        
        // if (this.defaultProperties.has(property)) {
        //     return true;
        // }

        let oneGroupHasPerson = false;

        for (const groupId in this.groupsList) {
            if (this.groupsList[groupId].members.has(personId)) {
                oneGroupHasPerson = true;

                if (this.groupsList[groupId].properties.has(property)) {
                    return true;
                }
            }
        }

        return !oneGroupHasPerson && this.defaultProperties.has(property);
    }

    checkPersonInCurrGroup(personId) {
        return this.groupsList[this.currentGroupId].members.has(personId);
    }
  }
  