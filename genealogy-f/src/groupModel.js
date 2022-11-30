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
        if (this.defaultProperties.has(property)) {
            return true;
        }
    }

    /* Checker for person */
    checkPersonInCurrGroup(personId) {
        return this.groupsList[this.currentGroupId].members.has(personId);
    }
  }
  