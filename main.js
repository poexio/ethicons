// default ETH address
const svgSize = 256
const shapeCount = 3

// if Web3 is detected, use wallet address
const hasWeb3 = window && window.web3
if (hasWeb3) {
  d3.select('.web3').style('display', 'block')
  d3.selectAll('input.useWeb3').property('checked', 'true')
  updateUI()
}

// button actions
d3.select('.randomAddress').on('click', () => updateUI())
d3.select(".useWeb3").on("click", () => updateUI())
d3.select(".download").on("click", () => downloadPNG(address))


function updateUI() {
  // show/hide random button
  const useWeb3 = d3.selectAll('input.useWeb3').property('checked')
  const showRandomButton = useWeb3 ? 'none' : 'block'
  d3.select('.randomAddress').style('display',showRandomButton)

  // draw ethicon
  const address = getAddress()
  if (address) {
    d3.select('.ethAddress').html(address) // show address
    main(address, svgSize, shapeCount) // draw
  }
}

// get ETH address
function getAddress() {
  const useWeb3 = d3.selectAll('input.useWeb3').property('checked')
  return useWeb3 ? getWeb3Address() : getRandomAddress()
}

// get address from connected wallet
function getWeb3Address() {
  if (window.web3.eth.accounts.length) {
    return window.web3.eth.accounts[0].substring(2)
  } else {
    d3.select('.info')
      .html("No Address found. Make sure your wallet is ready.")
    return null
  }
}

// generate fake (but credible) ETH addresses
function getRandomAddress() {
  const pubKey = Math.random().toString(36).substring(7);
  // pubKey -> address
  var pubKeyWordArray = CryptoJS.enc.Hex.parse(pubKey);
  var hash = CryptoJS.SHA3(pubKeyWordArray, { outputLength: 256 });
  var address = hash.toString(CryptoJS.enc.Hex).slice(24);
  return address;
}

/*
* DRAWING
*/

function main(address, svgSize, shapeCount) {
  const colors = getColors(address)
  const letters = getLettersCount(address)
  const coords = getCoords(letters)
  const voronoid = getVoronoiCentroids(coords, svgSize)
  const shapeCoords = getShapes(coords, letters, shapeCount)
  drawSVG(shapeCoords, svgSize, colors)
}

// get 6 HEX colors from address
function getColors(account) {
  const colors = []
  for (let i = 0; i < account.length; i+=6) {
    if(account.length-i !== account.length%6) colors.push(account.slice(i, i+6))
  }
  return colors
}

// count occurences of letters
function getLettersCount(account) {
  const letters = account.split('')
  const countItems = letters.reduce( (count, curr, i) => {
        (typeof count[curr] === "undefined") ? count[curr] = [i] : count[curr].push(i)
        return count
      }, {})

  return countItems
}

// get coords from address
function getCoords(countLetters) {

  const lettersPos = {}
  d3.range(10)
    .map(d => ''+d)
    .concat("a", "b","c", "d", "e", "f")
    .forEach((d,i) => { lettersPos[d] = i })

  const tmpCoords = []
  Object.keys(countLetters).forEach( k => {
    countLetters[k].forEach(p => { tmpCoords.push([ p, lettersPos[k] ]) })
  })

  const maxX = d3.max(tmpCoords.map(d=>d[0]))
  const maxY = d3.max(tmpCoords.map(d=>d[1]))

  // map a number to a range
  function map (num, in_min, in_max, out_min, out_max) {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

  return tmpCoords.map(d => [
      map(d[0], 0, maxX, 10, svgSize-10),
      map(d[1], 0, maxY, 10, svgSize-10)
  ])

}

// parse voroinoi centroids
function getVoronoiCentroids(coords, svgSize) {

  const voronoi = d3.voronoi()
    .x(d => d[0])
    .y(d => d[1])
    .extent([[-1, -1], [svgSize, svgSize]])
    (coords)

  // helper function
  const getCentroid = (pts) => {
    var x = 0;
    var y = 0;
    for (var i = 0; i < pts.length; i++) {
      x += pts[i][0];
      y += pts[i][1];
    }
    var centroid = [Math.round(x/pts.length), Math.round(y/pts.length) ]
    return centroid
  }

  const centroids = voronoi.polygons().map(d => getCentroid(d))
  return centroids
}

// use only most used characters
// limit is the number of items to include
function getShapes(coords, countLetters, limit) {

  const mostUsed = Object.keys(countLetters)
    .filter(k=> countLetters[k].length > 2)
  mostUsed.length = limit // limit array length

  // get shape coords
  return Object.keys(countLetters)
    .filter(l => mostUsed.includes(l) )
    .map(k => countLetters[k].map(i => ({ 'coords' : coords[i], 'letter' : k })))

}

// draw as SVG
function drawSVG(shapesCoords, svgSize, colors) {
  // helper function
  const renderPath = (d) => {
    return d == null ? null : "M" + d.join("L") + "Z";
  }

  const svg = d3.select("svg")
      .style("background", 'white')
      .style("height", svgSize)
      .style("width", svgSize)

  svg.selectAll('*').remove()

  const shapes = svg.append('g')
       .classed('shapes', true)
       .selectAll('path.shape')
    .data(shapesCoords)
    .enter()
      .append('path')
      .classed('shapes', true)
      .attr('d', d => renderPath(d.map(d=>d.coords)))
      .style('fill', (d,i) => colors[i])
}

// download as PNG
function downloadPNG() {
  const filename = d3.select('.ethAddress').text()
  const DOMURL = window.URL || window.webkitURL || window

  const drawing = d3.select('svg').node()
  const svgString = (new window.XMLSerializer().serializeToString(drawing))

	const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
	const url = DOMURL.createObjectURL(svgBlob)

  const canvas = document.createElement('canvas')
  canvas.height = svgSize
  canvas.width = svgSize

  const ctx = canvas.getContext("2d")

  // tmp image to store SVG
	const img = new Image()
  img.src = url

  img.onload = function() {
    window.URL.revokeObjectURL(svgBlob)

    // our final png
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png")

    // download file
    var download = document.createElement('a');
    download.href = png
    download.download = `ETHicon-${filename}`
    download.click()
  }
}
