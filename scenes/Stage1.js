makeSpotsStage1(floors) {
  // floors = masīvs ar grīdu info:
  // { y, leftX, rightX }

  const spots = [];

  floors.forEach((f, index) => {
    const margin = 28;

    const xLeft = f.leftX + margin;
    const xRight = f.rightX - margin;

    // 1. stāvs (apakšā) – tikai 1 aparāts pa labi
    if (index === floors.length - 1) {
      spots.push({ floorIndex: index, x: xRight });
      return;
    }

    // augšējais stāvs – 3 aparāti
    if (index === 0) {
      spots.push({ floorIndex: index, x: xLeft });
      spots.push({ floorIndex: index, x: xRight });
      spots.push({ floorIndex: index, x: xRight - 40 });
      return;
    }

    // pārējie stāvi – 2 aparāti (kreisi + labi)
    spots.push({ floorIndex: index, x: xLeft });
    spots.push({ floorIndex: index, x: xRight });
  });

  return spots;
}
