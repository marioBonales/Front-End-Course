var map = {
  nick: "Nick Fury",
  hulk: "The Incredible Hulk",
  hawkeye: "Hawkeye",
  widow: "Black Widow",
  ironman: "Ironman",
  thor: "Thor"
}
$('.icon').click(
  function openModal(event){
    var name = $(event.currentTarget).attr('id');
    event.preventDefault();
    $(".heroe").text(map[name]);
    $("#modal").show();
    $(".modal-backdrop").show();
  }
)

$('.close, #modal').click(
  function closeModal(event) {
    $("#modal").hide();
    $(".modal-backdrop").hide();
  }
)

$('.modal-content').click(
  function preventDefault(event) {
    event.stopPropagation();
  }
);
