export class FilterModel {
  constructor(bloodline) {
    this.bloodline = bloodline;
    this.distance = 1;
    this.allFamilies = new Set();
    this.families = [];
  }
}
