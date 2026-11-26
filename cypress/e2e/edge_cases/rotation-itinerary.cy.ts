import { generateRotationSchedule } from "../../../src/lib/rotation-scheduler";
import { assignStationCell, assignTeam, rotationStop } from "../../../src/lib/rotation-itinerary";
import type { RotationTableData } from "../../../src/types/plan";

const makeTable = (): RotationTableData => ({
  id: "table", campId: "camp", ownerId: "admin",
  ...generateRotationSchedule({
    tableTitle: "上午闖關", day: "Day 1", teamCount: 4, roundCount: 3,
    stations: ["操場", "禮堂", "走廊", "廣場"].map((location, i) => ({
      planId: "station-" + i, name: "關卡" + i, location, lead: "主" + i, assistant: "副" + i,
    })),
  }),
});

describe("小隊行程與關卡對應", () => {
  it("四關三輪的智能排程逐輪對應地點、正副關主與對手", () => {
    const table = makeTable();
    for (const [index, team] of table.teamOrders.entries()) {
      expect(team.stations).to.have.length(3);
      table.rounds.forEach((round, i) => {
        const column = round.cells.findIndex(cell => cell.split(" vs ").includes(String(index + 1)));
        const stop = rotationStop(table, team, i);
        expect(team.stations[i]).to.equal(table.stations[column].id);
        expect(stop.station).to.deep.equal(table.stations[column]);
        expect(stop.detail).to.match(/^vs /);
      });
    }
  });

  it("保留舊表原文，區分待安排、待確認與休息", () => {
    const table = makeTable();
    table.stations[1].name = table.stations[0].name;
    table.rounds = table.rounds.map(() => ({ cells: [] }));
    const check = (value: string) => rotationStop(table, { ...table.teamOrders[0], stations: [value] }, 0);
    expect(check("關卡2 (vs 4)").station?.location).to.equal("走廊");
    expect(check("關卡0")).to.include({ label: "待確認", detail: "關卡0" });
    expect(check("舊關卡")).to.include({ label: "待確認", detail: "舊關卡" });
    expect(check("—").label).to.equal("休息");
    expect(check("").label).to.equal("待安排");
  });

  it("從小隊或關卡修改同一輪，都會更新另一側且保留後續輪次", () => {
    let table = makeTable();
    const later = table.teamOrders[0].stations.slice(1);
    table = { ...table, ...assignTeam(table, table.teamOrders[0], 0, "station-2") };
    expect(table.rounds[0].cells[2]).to.include(table.teamOrders[0].name);
    table = { ...table, ...assignStationCell(table, 0, 1, "第1小隊") };
    const team = table.teamOrders[0];
    expect(rotationStop(table, team, 0).station?.location).to.equal("禮堂");
    expect(table.rounds[0].cells[2]).not.to.include(team.name);
    expect(team.stations.slice(1)).to.deep.equal(later);
  });
});
