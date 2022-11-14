export class FilterModel {
  constructor(bloodline) {
    this.bloodline = bloodline;
    this.distance = 1;
    this.allFamilies = new Set();
    this.families = new Set();
    this.fromYear = '';
    this.toYear = '';
    this.birthPlace = '';
    this.deathPlace = '';
    this.personalName = '';
  }
}
