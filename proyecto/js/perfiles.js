var mapa = {
    thor: "Thor",
    nick: "Nick Fury",
    widow: "Black Widow",
    ironman: "Iron-man",
    hulk: "The Incredible Hulk",
    hawkeye: "Hawkeye"
};
$(function () {
   $(".icon").click(function(event){
       //Mostrar la modal
       $(".modal, .modal-backdrop").show();
       //Prevenir el efecto deafult del enlace
       event.preventDefault();
       // Obtener el id del elemento al que se le dio click
       var id = $(event.currentTarget).attr("id");
       //Reemplazar el nombre del heroe
       $(".heroe").text(mapa[id]);
   });

   $(".closeModal, .modal").click(function (event){
       //Esconder el modal
       $(".modal, .modal-backdrop").hide();
   });

   $(".modal-dialog").click(function (event){
       //Detiene la propagación del evento
       event.stopPropagation();
   });
});
