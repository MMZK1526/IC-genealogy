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

        this.groupsList = [{
            id: 0,
            name: "Group 0",
            members: new Set(),
            properties: new Set()
        }];
    }

    /* ### Initialize ### */
    initialize(initialSet) {
        this.defaultProperties = new Set([...initialSet].filter((x) => x !== 'id'));
        this.groupsList[this.currentGroupId].properties = new Set([...this.defaultProperties]);

        // console.log(this.groupsList[this.currentGroupId]);
    }

    /* ### Whole group operations ### */
    addNewGroup() {
        this.groupsList.push({
            id: this.groupsCount,
            name: "Group " + this.groupsCount,
            members: new Set(),
            properties: new Set([...this.defaultProperties])
        });
        this.groupsCount += 1;

        // console.log(this.groupsList);
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

    getAllGroups() {
        return this.groupsList;
    }

    /* ### Setters ### */
    setCurrentGroupId(groupId) {
        this.currentGroupId = groupId;
        console.log(this.currentGroupId);
        console.log(this.groupsList);
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
  